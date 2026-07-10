/**
 * Animated pixel-art scene for the "Predictooor" project card.
 *
 * A dark sonar screen: a chunky pixel whale glides across the deep, blowing a
 * cyan spout, while a green sonar line sweeps the water. When the whale passes
 * the tracked marker buoy, a green "+$2M" position tag pops, a leaderboard bar
 * shoots up, and the top wallet row flashes — a whale getting tracked live.
 * Pure SVG + CSS keyframes (see globals.css, "Predictooor whale card visual").
 * Server-rendered, no JS shipped.
 */

// 3x5 bitmap glyphs, drawn as 1px rects so the tag stays crisp at any scale.
const GLYPHS: Record<string, string[]> = {
  "+": ["000", "010", "111", "010", "000"],
  $: ["011", "110", "010", "011", "110"],
  "2": ["111", "001", "111", "100", "111"],
  M: ["101", "111", "101", "101", "101"],
};

function PixelWord({
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
        (GLYPHS[ch] ?? []).flatMap((row, ry) =>
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

export default function WhaleTrackerVisual() {
  return (
    <div className="relative w-full shrink-0">
      <div className="border-4 border-[#2d2d2d] bg-[#071a2b]">
        <svg
          viewBox="0 0 96 40"
          className="block h-auto w-full"
          shapeRendering="crispEdges"
          aria-hidden="true"
        >
          <defs>
            <pattern
              id="whv-grid"
              width="8"
              height="8"
              patternUnits="userSpaceOnUse"
            >
              <rect x="3" y="3" width="1" height="1" fill="#103048" />
            </pattern>
          </defs>

          {/* deep-water screen */}
          <rect x="0" y="0" width="96" height="40" fill="#071a2b" />
          <rect x="2" y="2" width="92" height="36" fill="url(#whv-grid)" />
          {/* faint depth strata */}
          <rect x="2" y="13" width="92" height="1" fill="#0d2a41" />
          <rect x="2" y="30" width="92" height="1" fill="#0d2a41" />

          {/* sonar sweep line — green scan gliding across the water */}
          <g className="whv-sweep">
            <rect x="0" y="4" width="1" height="32" fill="#92cc41" opacity="0.08" />
            <rect x="1" y="4" width="1" height="32" fill="#92cc41" opacity="0.16" />
            <rect x="2" y="4" width="2" height="32" fill="#92cc41" opacity="0.42" />
          </g>

          {/* tracked marker buoy (static): dotted post + diamond */}
          <g fill="#3f6a12">
            <rect x="63" y="8" width="1" height="1" />
            <rect x="63" y="10" width="1" height="1" />
            <rect x="63" y="12" width="1" height="1" />
            <rect x="63" y="14" width="1" height="1" />
            <rect x="63" y="16" width="1" height="1" />
            <rect x="63" y="18" width="1" height="1" />
            <rect x="63" y="20" width="1" height="1" />
            <rect x="63" y="22" width="1" height="1" />
            <rect x="63" y="24" width="1" height="1" />
          </g>
          <g fill="#92cc41">
            <rect x="62" y="6" width="3" height="1" />
            <rect x="63" y="5" width="1" height="1" />
            <rect x="63" y="7" width="1" height="1" />
          </g>

          {/* the whale — glides left to right across the deep */}
          <g className="whv-whale">
            {/* tail flukes */}
            <g fill="#24486b">
              <rect x="0" y="17" width="2" height="1" />
              <rect x="0" y="18" width="3" height="1" />
              <rect x="1" y="19" width="3" height="1" />
              <rect x="3" y="20" width="3" height="1" />
              <rect x="3" y="21" width="3" height="1" />
              <rect x="1" y="22" width="3" height="1" />
              <rect x="0" y="23" width="3" height="1" />
              <rect x="0" y="24" width="2" height="1" />
            </g>
            {/* body */}
            <g fill="#2b5a86">
              <rect x="9" y="17" width="13" height="1" />
              <rect x="7" y="18" width="17" height="1" />
              <rect x="6" y="19" width="19" height="1" />
              <rect x="5" y="20" width="21" height="1" />
              <rect x="5" y="21" width="21" height="1" />
              <rect x="6" y="22" width="19" height="1" />
              <rect x="7" y="23" width="16" height="1" />
            </g>
            {/* light belly */}
            <g fill="#4f93bf">
              <rect x="9" y="24" width="12" height="1" />
              <rect x="11" y="25" width="8" height="1" />
            </g>
            {/* eye */}
            <rect x="20" y="20" width="1" height="1" fill="#eef7ff" />
            <rect x="21" y="20" width="1" height="1" fill="#0a1f30" />
            {/* mouth */}
            <g fill="#173650">
              <rect x="22" y="23" width="3" height="1" />
              <rect x="24" y="22" width="1" height="1" />
            </g>
            {/* spout — puffs from the blowhole */}
            <g className="whv-spout" fill="#bfe9ff">
              <rect x="18" y="16" width="1" height="1" />
              <rect x="18" y="15" width="1" height="1" />
              <rect x="17" y="14" width="1" height="1" />
              <rect x="19" y="14" width="1" height="1" />
              <rect x="16" y="13" width="1" height="1" />
              <rect x="18" y="13" width="1" height="1" />
              <rect x="20" y="13" width="1" height="1" />
            </g>
          </g>

          {/* wallet leaderboard (top-left) — top row flashes on a hit */}
          <rect className="whv-lead" x="5" y="5" width="18" height="2" fill="#92cc41" />
          <rect x="5" y="8" width="12" height="2" fill="#4a7c10" />
          <rect x="5" y="11" width="7" height="2" fill="#3a610d" />

          {/* position bar — shoots up at the marker when the whale is tracked */}
          <rect
            className="whv-posbar"
            x="66"
            y="13"
            width="3"
            height="13"
            fill="#92cc41"
          />

          {/* "+$2M" alert tag — pops above the marker */}
          <g className="whv-tag">
            <rect x="51" y="3" width="22" height="10" fill="#08240f" />
            <rect x="51" y="3" width="22" height="1" fill="#92cc41" />
            <rect x="51" y="12" width="22" height="1" fill="#92cc41" />
            <rect x="51" y="3" width="1" height="10" fill="#92cc41" />
            <rect x="72" y="3" width="1" height="10" fill="#92cc41" />
            <rect x="61" y="13" width="3" height="1" fill="#92cc41" />
            <rect x="62" y="14" width="1" height="1" fill="#92cc41" />
            <PixelWord word="+$2M" x={54} y={5} fill="#92cc41" />
          </g>
        </svg>
      </div>
    </div>
  );
}
