/**
 * Tiny inline trend glyphs that sit beside a stat number for instant context.
 * Both normalize their data to a fixed viewBox; no axes, no labels. Pure SVG
 * (no hooks) so they render fine inside Server Components.
 */

const W = 74;
const H = 34;

export function Sparkline({
  points,
  width = W,
  height = H,
  className,
  stroke = "var(--chart-1)",
}: {
  points: number[];
  width?: number;
  height?: number;
  className?: string;
  stroke?: string;
}) {
  if (points.length < 2) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const pad = 4;
  const coords = points.map((v, i) => {
    const x = pad + (i / (points.length - 1)) * (width - pad * 2);
    const y = pad + (1 - (v - min) / span) * (height - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      aria-hidden
      className={className}
    >
      <polyline
        points={coords.join(" ")}
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function MiniBars({
  values,
  width = W,
  height = H,
  className,
}: {
  values: number[];
  width?: number;
  height?: number;
  className?: string;
}) {
  if (values.length === 0) return null;
  const max = Math.max(...values, 1);
  const n = values.length;
  const gap = 3;
  const barW = (width - gap * (n - 1)) / n;
  // Alternating violet shades for rhythm (tokens, lightest→darkest).
  const shades = ["#C4B5FD", "#A855F7", "#7C3AED"];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      aria-hidden
      className={className}
    >
      {values.map((v, i) => {
        const h = Math.max(3, (v / max) * (height - 6));
        const x = i * (barW + gap);
        const y = height - h;
        return (
          <rect
            key={i}
            x={x.toFixed(1)}
            y={y.toFixed(1)}
            width={Math.max(3, barW).toFixed(1)}
            height={h.toFixed(1)}
            rx="2"
            fill={shades[i % shades.length]}
          />
        );
      })}
    </svg>
  );
}
