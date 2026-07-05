import type { CSSProperties, ReactNode } from "react";

// 2x2 ordered-dither checkerboards at 25/50/75% coverage — quadrant squares
// drawn with conic-gradient hard stops, tiled at --tile size.
const density: Record<25 | 50 | 75, (color: string) => string> = {
  25: (c) => `conic-gradient(${c} 0 25%, transparent 25%)`,
  50: (c) =>
    `conic-gradient(${c} 0 25%, transparent 25% 50%, ${c} 50% 75%, transparent 75%)`,
  75: (c) => `conic-gradient(${c} 0 75%, transparent 75%)`,
};

const RAMP: Array<25 | 50 | 75> = [25, 50, 75];

function DitherEdge({ color, flip }: { color: string; flip?: boolean }) {
  const rows = flip ? [...RAMP].reverse() : RAMP;
  return (
    <div aria-hidden="true">
      {rows.map((d) => (
        <div
          key={d}
          className="h-[1.5rem]"
          style={{
            backgroundImage: density[d](color),
            backgroundSize: "0.75rem 0.75rem",
          }}
        />
      ))}
    </div>
  );
}

// Full-bleed tinted section that dithers in from the page background and
// back out again, instead of ending on a hard border.
export default function DitherBand({
  color,
  className,
  children,
}: {
  color: string;
  className?: string;
  children: ReactNode;
}) {
  const bg: CSSProperties = { backgroundColor: color };
  return (
    <div>
      <DitherEdge color={color} />
      <div className={className} style={bg}>
        {children}
      </div>
      <DitherEdge color={color} flip />
    </div>
  );
}
