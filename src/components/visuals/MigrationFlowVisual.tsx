/**
 * Animated pixel-art scene for the "China Migration" project card.
 *
 * A miniature migration map: two simplified landmasses on a dark sea grid —
 * an origin (left) and a destination (right) — joined by four curved routes.
 * Warm amber particles (chunky dashed dots) stream along the upper routes
 * outbound and the lower routes inbound, both directions at once, while the
 * coastal "ports" at each route mouth pulse as they send and receive. Pure
 * SVG + CSS keyframes (see globals.css, "China migration card visual") —
 * server-rendered, no JS shipped.
 */

export default function MigrationFlowVisual() {
  return (
    <div className="relative w-full shrink-0">
      <div className="border-4 border-[#2d2d2d] bg-[#0e1726]">
        <svg
          viewBox="0 0 96 40"
          className="block h-auto w-full"
          shapeRendering="crispEdges"
          aria-hidden="true"
        >
          <defs>
            <pattern
              id="mfv-grid"
              width="8"
              height="8"
              patternUnits="userSpaceOnUse"
            >
              <rect x="3" y="3" width="1" height="1" fill="#1b2740" />
            </pattern>
          </defs>

          {/* dark sea + faint map grid */}
          <rect x="0" y="0" width="96" height="40" fill="#0e1726" />
          <rect x="0" y="0" width="96" height="40" fill="url(#mfv-grid)" />

          {/* landmasses */}
          <g fill="#26384f">
            {/* left — origin */}
            <rect x="14" y="9" width="10" height="3" />
            <rect x="12" y="12" width="15" height="4" />
            <rect x="11" y="16" width="17" height="5" />
            <rect x="13" y="21" width="13" height="4" />
            <rect x="16" y="25" width="8" height="3" />
            {/* right — destination */}
            <rect x="71" y="12" width="9" height="3" />
            <rect x="69" y="15" width="13" height="4" />
            <rect x="70" y="19" width="11" height="4" />
            <rect x="72" y="23" width="8" height="3" />
          </g>
          {/* lit coasts for a touch of depth */}
          <g fill="#3a5478">
            <rect x="14" y="9" width="10" height="1" />
            <rect x="71" y="12" width="9" height="1" />
          </g>

          {/* dim static routes so the map still reads when frozen */}
          <g fill="none" stroke="#3f3320" strokeWidth="1">
            <path d="M27 14 Q48 2 68 12" />
            <path d="M27 18 Q48 9 68 16" />
            <path d="M68 24 Q48 30 27 22" />
            <path d="M68 28 Q48 38 27 26" />
          </g>

          {/* outbound streams (top) — dots travel left to right */}
          <path
            className="mfv-flow-a1"
            d="M27 14 Q48 2 68 12"
            fill="none"
            stroke="#f7d51d"
            strokeWidth="2"
          />
          <path
            className="mfv-flow-a2"
            d="M27 18 Q48 9 68 16"
            fill="none"
            stroke="#f59e6b"
            strokeWidth="2"
          />

          {/* inbound streams (bottom) — dots travel right to left */}
          <path
            className="mfv-flow-b1"
            d="M68 24 Q48 30 27 22"
            fill="none"
            stroke="#f59e6b"
            strokeWidth="2"
          />
          <path
            className="mfv-flow-b2"
            d="M68 28 Q48 38 27 26"
            fill="none"
            stroke="#f7d51d"
            strokeWidth="2"
          />

          {/* ports that send (origins) */}
          <g className="mfv-port-a" fill="#f7d51d">
            <rect x="25" y="13" width="2" height="5" />
            <rect x="66" y="23" width="2" height="6" />
          </g>
          {/* ports that receive (destinations) */}
          <g className="mfv-port-b" fill="#f59e6b">
            <rect x="66" y="11" width="2" height="6" />
            <rect x="25" y="21" width="2" height="6" />
          </g>
        </svg>
      </div>
    </div>
  );
}
