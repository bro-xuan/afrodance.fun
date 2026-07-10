/**
 * Animated pixel-art scene for the "Greenroom" project card.
 *
 * A tiny recording booth: a pixel condenser mic on a stand under a soft green
 * stage light, a six-band EQ meter beside it that ripples as your voice is
 * captured, a red REC dot blinking in the corner, and a green "sourced" check
 * that pops (with a one-shot ring flash) each time a claim gets cited. Pure
 * SVG + CSS keyframes (see globals.css, "Greenroom mic visual") — server
 * rendered, zero JS shipped.
 *
 * The EQ bars are full-height rects clipped to the meter window and pushed
 * DOWN by whole pixels, so they always grow crisply from a fixed baseline.
 */

// 3x5 bitmap glyphs, emitted as 1px rects so the REC label stays crisp.
const GLYPHS: Record<string, string[]> = {
  R: ["110", "101", "110", "101", "101"],
  E: ["111", "100", "110", "100", "111"],
  C: ["111", "100", "100", "100", "111"],
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

export default function MicWaveformVisual() {
  return (
    <div className="relative w-full shrink-0">
      <div className="border-4 border-[#2d2d2d] bg-[#f2efe0]">
        <svg
          viewBox="0 0 96 40"
          className="block h-auto w-full"
          shapeRendering="crispEdges"
          aria-hidden="true"
        >
          <defs>
            <pattern
              id="grv-grid"
              width="8"
              height="8"
              patternUnits="userSpaceOnUse"
            >
              <rect x="3" y="3" width="1" height="1" fill="#e4dac2" />
            </pattern>
            <clipPath id="grv-clip">
              <rect x="35" y="13" width="30" height="20" />
            </clipPath>
          </defs>

          <rect x="0" y="0" width="96" height="40" fill="#f2efe0" />
          <rect x="4" y="4" width="88" height="29" fill="url(#grv-grid)" />

          {/* floor line + brighter tick under the meter */}
          <rect x="6" y="33" width="84" height="1" fill="#cdc0a0" />
          <rect x="35" y="33" width="30" height="1" fill="#6f9c33" />

          {/* EQ meter — tall bars clipped so they grow from the baseline */}
          <g clipPath="url(#grv-clip)">
            <rect className="grv-bar grv-bar1" x="36" y="13" width="3" height="20" fill="#4a7c10" />
            <rect className="grv-bar grv-bar2" x="41" y="13" width="3" height="20" fill="#6aad30" />
            <rect className="grv-bar grv-bar3" x="46" y="13" width="3" height="20" fill="#4a7c10" />
            <rect className="grv-bar grv-bar4" x="51" y="13" width="3" height="20" fill="#6aad30" />
            <rect className="grv-bar grv-bar5" x="56" y="13" width="3" height="20" fill="#4a7c10" />
            <rect className="grv-bar grv-bar6" x="61" y="13" width="3" height="20" fill="#6aad30" />
          </g>

          {/* microphone head */}
          <rect x="16" y="4" width="8" height="1" fill="#9aa4b0" />
          <rect x="15" y="5" width="10" height="12" fill="#9aa4b0" />
          <rect x="16" y="17" width="8" height="1" fill="#9aa4b0" />
          <rect x="23" y="5" width="2" height="12" fill="#737d89" />
          <rect x="15" y="5" width="1" height="12" fill="#2d2d2d" />
          <rect x="17" y="7" width="6" height="1" fill="#6b7580" />
          <rect x="17" y="9" width="6" height="1" fill="#6b7580" />
          <rect x="17" y="11" width="6" height="1" fill="#6b7580" />
          <rect x="17" y="13" width="6" height="1" fill="#6b7580" />

          {/* collar, handle, power LED */}
          <rect x="18" y="18" width="4" height="2" fill="#6b7580" />
          <rect x="18" y="20" width="4" height="5" fill="#9aa4b0" />
          <rect x="21" y="20" width="1" height="5" fill="#6b7580" />
          <rect className="grv-led" x="19" y="22" width="2" height="2" fill="#4a7c10" />

          {/* stand pole + base */}
          <rect x="19" y="25" width="2" height="7" fill="#5a6470" />
          <rect x="14" y="31" width="12" height="1" fill="#6b7580" />
          <rect x="12" y="32" width="16" height="1" fill="#5a6470" />

          {/* soft green stage light over the mic */}
          <polygon
            className="grv-beam"
            points="17,1 22,1 28,22 10,22"
            fill="#6aad30"
            fillOpacity="0.12"
          />

          {/* REC indicator */}
          <g className="grv-rec" fill="#d44332">
            <rect x="67" y="5" width="2" height="1" />
            <rect x="66" y="6" width="4" height="2" />
            <rect x="67" y="8" width="2" height="1" />
          </g>
          <PixelWord word="REC" x={72} y={5} fill="#cf3a2a" />

          {/* one-shot ring that flashes as the check pops */}
          <g className="grv-checkring" fill="#6aad30">
            <rect x="77" y="22" width="9" height="1" />
            <rect x="77" y="31" width="9" height="1" />
            <rect x="76" y="23" width="1" height="8" />
            <rect x="86" y="23" width="1" height="8" />
          </g>

          {/* "sourced" check mark */}
          <g className="grv-check">
            <g fill="#4a7c10">
              <rect x="78" y="27" width="1" height="2" />
              <rect x="79" y="28" width="1" height="2" />
              <rect x="80" y="29" width="1" height="2" />
              <rect x="81" y="28" width="1" height="2" />
              <rect x="82" y="27" width="1" height="2" />
              <rect x="83" y="26" width="1" height="2" />
              <rect x="84" y="25" width="1" height="2" />
            </g>
            <g fill="#6aad30">
              <rect x="78" y="26" width="1" height="2" />
              <rect x="79" y="27" width="1" height="2" />
              <rect x="80" y="28" width="1" height="2" />
              <rect x="81" y="27" width="1" height="2" />
              <rect x="82" y="26" width="1" height="2" />
              <rect x="83" y="25" width="1" height="2" />
              <rect x="84" y="24" width="1" height="2" />
            </g>
          </g>
        </svg>
      </div>
    </div>
  );
}
