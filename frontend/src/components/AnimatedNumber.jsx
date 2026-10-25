import * as React from "react";

import { number as formatNumber } from "@/lib/utils";

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * Counts from the previous value to the new one. The first render counts up
 * from zero so a freshly loaded dashboard feels alive; later refetches glide
 * from the old figure, so a change in stock is something you *see* happen.
 *
 * Reduced-motion users get the final value immediately.
 */
export function AnimatedNumber({ value, format = formatNumber, duration = 900, className }) {
  const target = Number(value) || 0;
  const reduced = React.useMemo(prefersReducedMotion, []);
  const [display, setDisplay] = React.useState(0);
  const fromRef = React.useRef(0);

  React.useEffect(() => {
    if (reduced) return;
    const from = fromRef.current;
    if (from === target) return;

    let frame;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1);
      // easeOutExpo: fast start, gentle landing on the real number.
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      const next = from + (target - from) * eased;
      fromRef.current = next;
      setDisplay(next);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration, reduced]);

  return (
    <span className={className} aria-label={format(target)}>
      <span aria-hidden="true">{format(reduced ? target : display)}</span>
    </span>
  );
}
