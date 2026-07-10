// Animated pixel-art scene for the "ADHD Saver" project card.
//
// A miniature focus HUD: a target reticle with corner brackets and a sweeping
// scan line watches a green "gaze" dot. The dot wanders off-center while the
// yellow FOCUS meter drains; an alert ring blips, nudges the dot back to
// center, and the meter refills. Pure SVG + CSS keyframes (see globals.css,
// "ftv-* ADHD Saver focus HUD") — server-rendered, zero JS shipped.

// 3x5 bitmap glyphs, drawn as 1px rects so the label stays crisp at any scale.
const FTV_GLYPHS: Record<string, string[]> = {
  F: ["111", "100", "110", "100", "100"],
  O: ["111", "101", "101", "101", "111"],
  C: ["111", "100", "100", "100", "111"],
  U: ["101", "101", "101", "101", "111"],
  S: ["111", "100", "111", "001", "111"],
};

function FtvPixelWord({
  word,
  x,
  y,
  fill,
}: {
  word: string;
  x: number;
  y: number;
  fill: string;
}) {
  return (
    <g fill={fill}>
      {[...word].flatMap((ch, i) =>
        (FTV_GLYPHS[ch] ?? []).flatMap((row, ry) =>
          [...row].map((bit, rx) =>
            bit === "1" ? (
              <rect
                key={i + "-" + ry + "-" + rx}
                x={x + i * 4 + rx}
                y={y + ry}
                width={1}
                height={1}
              />
            ) : null
          )
        )
      )}
    </g>
  );
}

export default function FocusTrackerVisual() {
  return (
    <div className="relative w-full shrink-0">
      <div className="border-4 border-[#2d2d2d] bg-[#1a1508]">
        <svg
          viewBox="0 0 96 40"
          className="block h-auto w-full"
          shapeRendering="crispEdges"
          aria-hidden="true"
        >
          <defs>
            <pattern
              id="ftv-grid"
              width="8"
              height="8"
              patternUnits="userSpaceOnUse"
            >
              <rect x="3" y="3" width="1" height="1" fill="#2a2410" />
            </pattern>
          </defs>

          <rect x="0" y="0" width="96" height="40" fill="#1a1508" />

          {/* scanning field */}
          <rect x="26" y="6" width="45" height="19" fill="url(#ftv-grid)" />

          {/* reticle corner brackets */}
          <g fill="#c9a800">
            <rect x="26" y="6" width="6" height="1" />
            <rect x="26" y="6" width="1" height="6" />
            <rect x="65" y="6" width="6" height="1" />
            <rect x="70" y="6" width="1" height="6" />
            <rect x="26" y="24" width="6" height="1" />
            <rect x="26" y="19" width="1" height="6" />
            <rect x="65" y="24" width="6" height="1" />
            <rect x="70" y="19" width="1" height="6" />
          </g>

          {/* center target box */}
          <g fill="#8a7420">
            <rect x="45" y="12" width="7" height="1" />
            <rect x="45" y="18" width="7" height="1" />
            <rect x="45" y="12" width="1" height="7" />
            <rect x="51" y="12" width="1" height="7" />
          </g>

          {/* sweeping scan line */}
          <g className="ftv-scan">
            <rect x="27" y="6" width="43" height="1" fill="#6b5c1e" />
          </g>

          {/* alert ring — small blip frame */}
          <g className="ftv-alert-a" fill="#f7d51d" opacity="0">
            <rect x="43" y="10" width="11" height="1" />
            <rect x="43" y="20" width="11" height="1" />
            <rect x="43" y="10" width="1" height="11" />
            <rect x="53" y="10" width="1" height="11" />
          </g>
          {/* alert ring — large blip frame */}
          <g className="ftv-alert-b" fill="#f7d51d" opacity="0">
            <rect x="39" y="6" width="19" height="1" />
            <rect x="39" y="24" width="19" height="1" />
            <rect x="39" y="6" width="1" height="19" />
            <rect x="57" y="6" width="1" height="19" />
          </g>

          {/* wandering gaze dot */}
          <g className="ftv-dot">
            <rect x="47" y="14" width="3" height="3" fill="#92cc41" />
          </g>

          {/* FOCUS meter */}
          <FtvPixelWord word="FOCUS" x={4} y={33} fill="#f7d51d" />
          <rect x="26" y="32" width="66" height="6" fill="#3a2f0a" />
          <g className="ftv-meter">
            <rect x="27" y="33" width="64" height="4" fill="#f7d51d" />
            <rect x="27" y="33" width="64" height="1" fill="#fbe66a" />
          </g>
        </svg>
      </div>
    </div>
  );
}
