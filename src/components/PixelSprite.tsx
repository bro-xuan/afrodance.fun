import type { CSSProperties } from "react";
import { SPRITE_PALETTE, type SpriteDef } from "@/data/sprites";

// A horizontal run of same-colored pixels, merged into one <rect> so a
// sprite renders as a handful of rects instead of one per pixel.
type Run = { x: number; y: number; w: number; fill: string };

function frameRuns(frame: string[]): Run[] {
  const runs: Run[] = [];
  frame.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      const fill = SPRITE_PALETTE[ch];
      if (!fill) {
        x++;
        continue;
      }
      let w = 1;
      while (x + w < row.length && row[x + w] === ch) w++;
      runs.push({ x, y, w, fill });
      x += w;
    }
  });
  return runs;
}

function gridDims(frames: string[][]) {
  // Guard the spreads: an empty sprite (or an empty frame) would make Math.max
  // return -Infinity and poison the viewBox / aspectRatio. Fall back to 1x1.
  const rowLengths = frames.flat().map((r) => r.length);
  const cols = rowLengths.length ? Math.max(...rowLengths) : 0;
  const rows = frames.length ? Math.max(...frames.map((f) => f.length)) : 0;
  return { cols: cols || 1, rows: rows || 1 };
}

// Renders an original pixel-art sprite as crisp SVG. One frame draws statically;
// two frames alternate on a stepped timer for a walk/flap cycle. Vector output
// means it stays crisp at any rem size and needs no raster asset.
export default function PixelSprite({
  def,
  width,
  frameDur = "0.42s",
  className,
  style,
}: {
  def: SpriteDef;
  /** CSS width, e.g. "2.75rem"; height follows from the sprite's aspect ratio */
  width: string;
  frameDur?: string;
  className?: string;
  style?: CSSProperties;
}) {
  const { cols, rows } = gridDims(def.frames);
  const animated = def.frames.length > 1;

  return (
    <span
      aria-hidden="true"
      className={`sprite${animated ? " sprite-anim" : ""} ${className ?? ""}`}
      style={
        {
          width,
          aspectRatio: `${cols} / ${rows}`,
          "--sframe": frameDur,
          ...style,
        } as CSSProperties
      }
    >
      {def.frames.map((frame, fi) => (
        <svg
          key={fi}
          className={`sf${fi}`}
          viewBox={`0 0 ${cols} ${rows}`}
          shapeRendering="crispEdges"
          preserveAspectRatio="xMidYMax meet"
        >
          {frameRuns(frame).map((r, i) => (
            <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={r.fill} />
          ))}
        </svg>
      ))}
    </span>
  );
}
