import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { api, onSessionExpired, tokenStore } from "@/lib/api";

const AuthContext = React.createContext(null);

export function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const [user, setUser] = React.useState(() => tokenStore.user());
  // `true` until we've either confirmed the stored token or discarded it, so
  // protected routes don't redirect to /login on a legitimate refresh.
  const [bootstrapping, setBootstrapping] = React.useState(() => Boolean(tokenStore.access()));

  const signOut = React.useCallback(
    ({ silent = false } = {}) => {
      tokenStore.clear();
      setUser(null);
      queryClient.clear();
      if (!silent) {
        // Fire-and-forget: the token is already gone locally either way.
        api.post("/auth/logout").catch(() => {});
      }
    },
    [queryClient],
  );

  /* A refresh token that no longer works ends the session exactly once, no
     matter how many requests failed at the same time. */
  React.useEffect(
    () =>
      onSessionExpired(() => {
        setUser(null);
        queryClient.clear();
        toast.error("Your session expired", {
          description: "Please sign in again to continue.",
        });
      }),
    [queryClient],
  );

  /* Verify the stored token on boot. This also picks up role or name changes an
     admin made while this browser was closed. */
  React.useEffect(() => {
    if (!tokenStore.access()) {
      setBootstrapping(false);
      return;
    }
    let cancelled = false;
    api
      .get("/auth/me")
      .then(({ data }) => {
        if (cancelled) return;
        tokenStore.setUser(data.user);
        setUser(data.user);
      })
      .catch((error) => {
        if (cancelled) return;
        // A network blip shouldn't sign you out — only a rejected token does,
        // and the interceptor has already cleared storage in that case.
        if (error.code !== "NETWORK_ERROR" && error.code !== "TIMEOUT") {
          tokenStore.clear();
          setUser(null);
        }
      })
      .finally(() => {
        if (!cancelled) setBootstrapping(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = React.useCallback(async (credentials) => {
    const { data } = await api.post("/auth/login", credentials, { skipAuth: true });
    tokenStore.set(data);
    setUser(data.user);
    return data.user;
  }, []);

  const updateUser = React.useCallback((next) => {
    tokenStore.setUser(next);
    setUser(next);
  }, []);

  const value = React.useMemo(
    () => ({
      user,
      bootstrapping,
      isAuthenticated: Boolean(user),
      isAdmin: user?.role === "admin",
      signIn,
      signOut,
      updateUser,
    }),
    [user, bootstrapping, signIn, signOut, updateUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}
