export type DriftPixel = {
  pos: string;
  size: string;
  color: string;
  speed: "drift-slow" | "drift-mid" | "drift-fast";
  /** float-pixel bob delay — omit for pixels that only parallax */
  bob?: string;
};

// Decorative gutter pixels with scroll-linked parallax. Outer span carries the
// drift transform, inner span the float bob, so the two never fight over
// the same transform.
export default function DriftPixels({
  pixels,
  className,
}: {
  pixels: DriftPixel[];
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 ${className ?? ""}`}
    >
      {pixels.map((p, i) => (
        <span key={i} className={`drift-pixel absolute ${p.pos} ${p.speed}`}>
          <span
            className={`block ${p.size} ${p.color}${p.bob ? " float-pixel" : ""}`}
            style={p.bob ? { animationDelay: p.bob } : undefined}
          />
        </span>
      ))}
    </div>
  );
}
