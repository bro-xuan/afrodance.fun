/**
 * Animated pixel-art scene for the "NL House Buying Tool" project card.
 *
 * A Dutch canal house lays itself up brick-course by brick-course against a
 * blue sky — bottom rows first, tall shutter windows, then the stepped gable
 * (trapgevel) and its hoist beam snap in last. Beside it a windmill turns its
 * sails, a tulip nods on the bank, clouds drift, and the canal (card-accent
 * blue) shimmers. Then the whole thing resets and rebuilds. Pure SVG + CSS
 * keyframes (see globals.css, "NL house build card visual") — no JS shipped.
 */
export default function HouseBuildVisual() {
  return (
    <div className="relative w-full shrink-0">
      <div className="border-4 border-[#2d2d2d] bg-[#123049]">
        <svg
          viewBox="0 0 96 40"
          className="block h-auto w-full"
          shapeRendering="crispEdges"
          aria-hidden="true"
        >
          {/* sky */}
          <rect x={0} y={0} width={96} height={13} fill="#2575a6" />
          <rect x={0} y={13} width={96} height={18} fill="#1d6091" />

          {/* clouds, drifting behind the house */}
          <g className="nhv-cloud1" fill="#cfe6f5">
            <rect x={22} y={7} width={3} height={1} />
            <rect x={24} y={6} width={8} height={2} />
            <rect x={26} y={4} width={5} height={2} />
          </g>
          <g className="nhv-cloud2" fill="#bcdcf0">
            <rect x={82} y={6} width={3} height={1} />
            <rect x={72} y={5} width={10} height={2} />
            <rect x={75} y={3} width={6} height={2} />
          </g>

          {/* grass bank + canal water (card accent) */}
          <rect x={0} y={31} width={96} height={4} fill="#3f7a2f" />
          <rect x={0} y={31} width={96} height={1} fill="#57a03a" />
          <rect x={0} y={35} width={96} height={5} fill="#1a7abb" />
          <g className="nhv-ripple" fill="#209cee">
            <rect x={6} y={37} width={7} height={1} />
            <rect x={30} y={38} width={9} height={1} />
            <rect x={58} y={36} width={11} height={1} />
            <rect x={82} y={38} width={8} height={1} />
          </g>

          {/* windmill tower + cap */}
          <g>
            <rect x={8} y={27} width={10} height={4} fill="#7a4636" />
            <rect x={9} y={23} width={8} height={4} fill="#7a4636" />
            <rect x={10} y={19} width={6} height={4} fill="#7a4636" />
            <rect x={11} y={16} width={4} height={3} fill="#7a4636" />
            <rect x={8} y={27} width={1} height={4} fill="#94573f" />
            <rect x={9} y={23} width={1} height={4} fill="#94573f" />
            <rect x={10} y={19} width={1} height={4} fill="#94573f" />
            <rect x={12} y={27} width={2} height={4} fill="#3a251a" />
            <rect x={10} y={13} width={6} height={3} fill="#5a3a28" />
          </g>
          {/* turning sails, pivoting on the hub */}
          <g className="nhv-blades" fill="#ecdcae">
            <rect x={12} y={6} width={2} height={8} />
            <rect x={12} y={14} width={2} height={8} />
            <rect x={5} y={13} width={8} height={2} />
            <rect x={13} y={13} width={8} height={2} />
            <rect x={11} y={6} width={4} height={2} />
            <rect x={11} y={20} width={4} height={2} />
            <rect x={5} y={12} width={2} height={4} />
            <rect x={19} y={12} width={2} height={4} />
          </g>
          <rect x={11} y={12} width={4} height={4} fill="#3a251a" />
          <rect x={12} y={13} width={2} height={2} fill="#94573f" />

          {/* tulip, nodding on the bank */}
          <g className="nhv-tulip">
            <rect x={37} y={25} width={1} height={6} fill="#3f7a2f" />
            <rect x={34} y={27} width={3} height={1} fill="#4d9138" />
            <rect x={38} y={28} width={3} height={1} fill="#4d9138" />
            <rect x={35} y={22} width={5} height={3} fill="#e0574a" />
            <rect x={36} y={21} width={3} height={1} fill="#e0574a" />
            <rect x={37} y={21} width={1} height={1} fill="#2575a6" />
            <rect x={36} y={22} width={1} height={2} fill="#f07a6e" />
          </g>

          {/* canal-house facade — revealed bottom-up by the build mask */}
          <g>
            <rect x={44} y={13} width={20} height={18} fill="#b5533a" />
            <rect x={44} y={13} width={1} height={18} fill="#c8694f" />
            <rect x={63} y={13} width={1} height={18} fill="#8f3e2b" />
            {[15, 17, 19, 21, 23, 25, 27, 29].map((y) => (
              <rect
                key={"nhv-m-" + y}
                x={44}
                y={y}
                width={20}
                height={1}
                fill="#8f3e2b"
              />
            ))}
            {/* upper-floor windows */}
            <rect x={46} y={15} width={4} height={5} fill="#2b6c94" />
            <rect x={47} y={16} width={2} height={3} fill="#a9d8f0" />
            <rect x={52} y={15} width={4} height={5} fill="#2b6c94" />
            <rect x={53} y={16} width={2} height={3} fill="#a9d8f0" />
            <rect x={58} y={15} width={4} height={5} fill="#2b6c94" />
            <rect x={59} y={16} width={2} height={3} fill="#a9d8f0" />
            {/* ground-floor windows */}
            <rect x={46} y={24} width={4} height={5} fill="#2b6c94" />
            <rect x={47} y={25} width={2} height={3} fill="#a9d8f0" />
            <rect x={58} y={24} width={4} height={5} fill="#2b6c94" />
            <rect x={59} y={25} width={2} height={3} fill="#a9d8f0" />
            {/* door */}
            <rect x={52} y={24} width={4} height={7} fill="#3a251a" />
            <rect x={53} y={25} width={2} height={5} fill="#5e382a" />
            <rect x={54} y={28} width={1} height={1} fill="#ecc34a" />
          </g>

          {/* build mask: sky-coloured, collapses upward to lay the courses */}
          <rect
            className="nhv-build"
            x={44}
            y={13}
            width={20}
            height={18}
            fill="#1d6091"
          />

          {/* roof + stepped gable + hoist beam — snaps in last */}
          <g className="nhv-roof">
            <rect x={44} y={11} width={20} height={2} fill="#b5533a" />
            <rect x={46} y={9} width={16} height={2} fill="#b5533a" />
            <rect x={48} y={7} width={12} height={2} fill="#b5533a" />
            <rect x={50} y={5} width={8} height={2} fill="#b5533a" />
            <rect x={52} y={3} width={4} height={2} fill="#b5533a" />
            <rect x={44} y={12} width={20} height={1} fill="#8f3e2b" />
            <rect x={46} y={10} width={16} height={1} fill="#8f3e2b" />
            <rect x={48} y={8} width={12} height={1} fill="#8f3e2b" />
            <rect x={50} y={6} width={8} height={1} fill="#8f3e2b" />
            <rect x={52} y={9} width={4} height={3} fill="#2b6c94" />
            <rect x={53} y={10} width={2} height={1} fill="#a9d8f0" />
            <rect x={53} y={1} width={2} height={2} fill="#3a251a" />
            <rect x={54} y={3} width={1} height={1} fill="#3a251a" />
          </g>
        </svg>
      </div>
    </div>
  );
}
