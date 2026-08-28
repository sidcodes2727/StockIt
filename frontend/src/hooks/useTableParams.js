import * as React from "react";
import { useSearchParams } from "react-router-dom";

/**
 * Keeps table filters in the query string.
 *
 * Two reasons this isn't component state: a filtered view is shareable and
 * survives a refresh, and the rest of the app can deep-link into it — the
 * low-stock bell opens `/products?stock_status=low_stock`, the dashboard opens
 * `/products?search=MED-0007`.
 *
 * `defaults` declares both the keys and their types. A value equal to its
 * default is dropped from the URL, so the address bar stays readable instead of
 * carrying every knob at its resting position.
 */
export function useTableParams(defaults) {
  const [searchParams, setSearchParams] = useSearchParams();

  const params = React.useMemo(() => {
    const result = {};
    for (const [key, fallback] of Object.entries(defaults)) {
      const raw = searchParams.get(key);
      if (raw === null || raw === "") {
        result[key] = fallback;
      } else if (typeof fallback === "number") {
        const parsed = Number(raw);
        result[key] = Number.isFinite(parsed) ? parsed : fallback;
      } else {
        result[key] = raw;
      }
    }
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, JSON.stringify(defaults)]);

  const setParams = React.useCallback(
    (patch) => {
      setSearchParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          const touchesFilter = Object.keys(patch).some((key) => key !== "page");

          for (const [key, value] of Object.entries(patch)) {
            if (value === undefined || value === null || value === "" || value === defaults[key]) {
              next.delete(key);
            } else {
              next.set(key, String(value));
            }
          }

          // Changing a filter while on page 4 would otherwise show an empty
          // table for a result set that now has one page.
          if (touchesFilter && !("page" in patch)) next.delete("page");

          return next;
        },
        { replace: true },
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setSearchParams, JSON.stringify(defaults)],
  );

  const reset = React.useCallback(() => {
    setSearchParams(new URLSearchParams(), { replace: true });
  }, [setSearchParams]);

  /** True when anything other than paging/sorting is narrowing the list. */
  const isFiltered = React.useMemo(
    () =>
      Object.entries(params).some(
        ([key, value]) =>
          !["page", "per_page", "sort_by", "sort_dir"].includes(key) &&
          value !== defaults[key],
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [params, JSON.stringify(defaults)],
  );

  return { params, setParams, reset, isFiltered };
}
