import axios from "axios";

/* Tokens live in localStorage so a refresh keeps you signed in. The refresh
   token is only ever sent to /auth/refresh. */
const ACCESS_KEY = "stockflow-access-token";
const REFRESH_KEY = "stockflow-refresh-token";
const USER_KEY = "stockflow-user";

export const tokenStore = {
  access: () => localStorage.getItem(ACCESS_KEY),
  refresh: () => localStorage.getItem(REFRESH_KEY),
  user: () => {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  set({ access_token, refresh_token, user }) {
    if (access_token) localStorage.setItem(ACCESS_KEY, access_token);
    if (refresh_token) localStorage.setItem(REFRESH_KEY, refresh_token);
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  setUser(user) {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
  },
};

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  headers: { "Content-Type": "application/json" },
  timeout: 30_000,
});

api.interceptors.request.use((config) => {
  const token = tokenStore.access();
  if (token && !config.skipAuth) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/* ---------------------------------------------------------------------------
   Silent refresh.

   The backend distinguishes TOKEN_EXPIRED from TOKEN_INVALID, so an expired
   access token is retried once against /auth/refresh instead of bouncing the
   user to the login screen mid-task. Concurrent 401s share one refresh call.
   --------------------------------------------------------------------------- */

let refreshPromise = null;
const sessionExpiredListeners = new Set();

export function onSessionExpired(listener) {
  sessionExpiredListeners.add(listener);
  return () => sessionExpiredListeners.delete(listener);
}

function broadcastSessionExpired() {
  tokenStore.clear();
  sessionExpiredListeners.forEach((listener) => listener());
}

function refreshAccessToken() {
  if (refreshPromise) return refreshPromise;

  const refreshToken = tokenStore.refresh();
  if (!refreshToken) return Promise.reject(new Error("No refresh token"));

  refreshPromise = api
    .post("/auth/refresh", null, {
      skipAuth: true,
      headers: { Authorization: `Bearer ${refreshToken}` },
      _isRefresh: true,
    })
    .then((response) => {
      tokenStore.set(response.data);
      return response.data.access_token;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;

    if (response?.status === 401 && config && !config._isRefresh && !config._retried) {
      const code = response.data?.error?.code;
      // Only an *expired* token is worth retrying. A malformed or revoked one
      // will fail again, and retrying it would just double every request.
      if (code === "TOKEN_EXPIRED" && tokenStore.refresh()) {
        try {
          const token = await refreshAccessToken();
          config._retried = true;
          config.headers.Authorization = `Bearer ${token}`;
          return api(config);
        } catch {
          broadcastSessionExpired();
        }
      } else if (code && code !== "INVALID_CREDENTIALS") {
        broadcastSessionExpired();
      }
    }

    return Promise.reject(normaliseError(error));
  },
);

/* ---------------------------------------------------------------------------
   Error normalisation.

   The API always answers with {"error": {code, message, details}}. Everything
   in the UI reads `err.message`, `err.code` and `err.fieldErrors`, so no
   component has to know the envelope shape — or guess when the server is down.
   --------------------------------------------------------------------------- */

export class ApiError extends Error {
  constructor({ message, code, details, status }) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.details = details;
    this.status = status;
  }

  /** Marshmallow returns {field: ["msg", ...]}; flatten for react-hook-form. */
  get fieldErrors() {
    if (!this.details || typeof this.details !== "object") return {};
    return Object.fromEntries(
      Object.entries(this.details)
        .filter(([, value]) => Array.isArray(value) || typeof value === "string")
        .map(([field, value]) => [field, Array.isArray(value) ? value.join(" ") : value]),
    );
  }
}

function normaliseError(error) {
  if (error.response) {
    const payload = error.response.data?.error;
    // Blob responses (a failed CSV/PDF export) arrive unparsed.
    if (!payload && error.response.data instanceof Blob) {
      return new ApiError({
        message: "The export could not be generated. Please try again.",
        code: "EXPORT_FAILED",
        status: error.response.status,
      });
    }
    return new ApiError({
      message: payload?.message || fallbackMessage(error.response.status),
      code: payload?.code || `HTTP_${error.response.status}`,
      details: payload?.details,
      status: error.response.status,
    });
  }

  if (error.code === "ECONNABORTED") {
    return new ApiError({
      message: "The request timed out. Check your connection and try again.",
      code: "TIMEOUT",
    });
  }

  return new ApiError({
    message:
      "Can't reach the server. Make sure the Flask API is running on port 5000.",
    code: "NETWORK_ERROR",
  });
}

function fallbackMessage(status) {
  if (status === 403) return "You don't have permission to do that.";
  if (status === 404) return "That record no longer exists.";
  if (status >= 500) return "Something went wrong on the server.";
  return "The request could not be completed.";
}

/** Unwrap `data` for the common case; used by every query hook. */
export async function get(url, params, config) {
  const { data } = await api.get(url, { params, ...config });
  return data;
}
