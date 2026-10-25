import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * A word-sized trend line. No axes and no tooltip — it answers "which way is
 * this heading?" and nothing else. The last point gets a dot so the eye lands
 * on "now".
 */
export function Sparkline({ values, className, height = 36, strokeClassName = "stroke-primary" }) {
  const id = React.useId();
  const points = (values ?? []).map((v) => Number(v) || 0);
  if (points.length < 2) return null;

  const width = 120;
  const pad = 3;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const span = max - min || 1;

  const coords = points.map((v, i) => [
    pad + (i / (points.length - 1)) * (width - pad * 2),
    pad + (1 - (v - min) / span) * (height - pad * 2),
  ]);

  const line = coords
    .map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");
  const area = `${line} L${coords.at(-1)[0].toFixed(1)},${height} L${coords[0][0].toFixed(1)},${height} Z`;
  const [lastX, lastY] = coords.at(-1);

  return (
    <div className={cn("relative h-9 w-full", className)} aria-hidden="true">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="size-full overflow-visible"
      >
        <defs>
          <linearGradient id={`spark-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.22" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#spark-${id})`} />
        <path
          d={line}
          fill="none"
          className={strokeClassName}
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      {/* An HTML dot, so it stays round however the SVG stretches. */}
      <span
        className="absolute size-[7px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary ring-[3px] ring-primary/20"
        style={{ left: `${(lastX / width) * 100}%`, top: `${(lastY / height) * 100}%` }}
      />
    </div>
  );
}
