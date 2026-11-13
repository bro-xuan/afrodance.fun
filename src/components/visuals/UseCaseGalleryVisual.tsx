/**
 * Animated pixel-art scene for the "What People Made" featured card.
 *
 * On the site's off-white paper, a gallery of things people made with AI
 * fills in tile by tile: a robot, a chart, a song, a game, a house, a chat, a
 * cube and a spark, each in its topic's colour from the site's stylesheet.
 * Three get the site's orange-red pick frame, a dotted line carries them
 * across, and the week's issue prints itself band by band on the right
 * (masthead, hero, takeaways, the picks as thumbnails) before a paper plane
 * takes it off to the inbox. Loop is 8s. Pure SVG + CSS keyframes (see
 * globals.css, "What People Made (UseCaseGalleryVisual)"); the base frame is
 * the full gallery, the picks framed and the issue printed, which is what
 * prefers-reduced-motion gets. Server-rendered, no JS shipped.
 */
import type { ReactElement } from "react";

type Bitmap = string[];

const PAPER = "#f5f4f2";
const WHITE = "#ffffff";
const INK = "#161311";
const INK_2 = "#504c49";
const RULE = "#d9d7d3";
const ACCENT = "#d24011";
const TOPIC = {
  games: "#734dbe",
  art: "#bd3a7f",
  apps: "#2a67bd",
  life: "#b66d00",
  learning: "#00828a",
  science: "#007748",
  work: "#6b6620",
};

interface Tile {
  /** 7×7, one character per pixel; "." lets the tile's paper show. */
  art: Bitmap;
  colours: Record<string, string>;
  /** One of the week's picks: framed, and a thumbnail in the issue. */
  pick?: boolean;
}

// Reading order: the top row left to right, then the bottom row.
const TILES: Tile[] = [
  {
    // a robot
    art: ["...o...", "...k...", ".#####.", ".#w#w#.", ".#####.", ".#kkk#.", ".#####."],
    colours: { "#": TOPIC.apps, w: WHITE, k: INK, o: ACCENT },
  },
  {
    // a chart
    art: [".......", ".....#.", "...#.#.", "...#.#.", ".#.#.#.", ".#.#.#.", "kkkkkkk"],
    colours: { "#": TOPIC.science, k: INK },
    pick: true,
  },
  {
    // a song
    art: ["..#####", "..#...#", "..#...#", "..#...#", "###.###", "###.###", "......."],
    colours: { "#": TOPIC.art },
  },
  {
    // a game
    art: ["..###..", ".#####.", "#ww#ww#", "#kw#kw#", "#######", "#######", "#.#.#.#"],
    colours: { "#": TOPIC.games, w: WHITE, k: INK },
    pick: true,
  },
  {
    // a house
    art: ["...#...", "..###..", ".#####.", "#######", ".owowo.", ".ooooo.", ".oo.oo."],
    colours: { "#": TOPIC.life, o: INK_2, w: WHITE },
  },
  {
    // a chat
    art: [".#####.", "#######", "#w#w#w#", "#######", ".#####.", ".##....", ".#....."],
    colours: { "#": TOPIC.learning, w: WHITE },
  },
  {
    // a cube
    art: ["..ooooo", ".ooooo%", "#####%%", "#####%%", "#####%%", "#####%.", "#####.."],
    colours: { "#": TOPIC.work, o: "#a8a35a", "%": "#47431a" },
    pick: true,
  },
  {
    // a spark
    art: ["...#...", "...#...", "..###..", "#######", "..###..", "...#...", "...#..."],
    colours: { "#": ACCENT },
  },
];

// The paper plane that sends the issue, pointing up and to the right.
const PLANE: Bitmap = ["......kk", "....kkwk", "..kkwwk.", "kkwwwk..", "..kwk...", "...k...."];

/** The gallery: 11px tiles on a 13px grid, four across and two down. */
const GX = 4;
const GY = 8;
const TILE = 11;
const PITCH = 13;
const tileAt = (i: number) => ({ x: GX + (i % 4) * PITCH, y: GY + Math.floor(i / 4) * PITCH });

/** A bitmap drawn from (x, y), one rect per run of a colour along each row. */
function Pixels({ art, colours, x, y }: { art: Bitmap; colours: Record<string, string>; x: number; y: number }) {
  const rects: ReactElement[] = [];
  art.forEach((row, ry) => {
    let start = 0;
    for (let rx = 1; rx <= row.length; rx++) {
      if (rx < row.length && row[rx] === row[start]) continue;
      const fill = colours[row[start]];
      if (fill) {
        rects.push(<rect key={`${ry}-${start}`} x={x + start} y={y + ry} width={rx - start} height={1} fill={fill} />);
      }
      start = rx;
    }
  });
  return rects;
}

export default function UseCaseGalleryVisual() {
  const picks = TILES.flatMap((t, i) => (t.pick ? [{ ...tileAt(i), colour: t.colours["#"] }] : []));

  return (
    <div className="relative w-full shrink-0">
      <div className="border-4 border-[#2d2d2d] bg-[#f5f4f2]">
        <svg viewBox="0 0 96 40" className="block h-auto w-full" shapeRendering="crispEdges" aria-hidden="true">
          <rect x="0" y="0" width="96" height="40" fill={PAPER} />

          {/* the gallery */}
          {TILES.map((tile, i) => {
            const { x, y } = tileAt(i);
            return (
              <g key={i}>
                <rect x={x} y={y} width={TILE} height={TILE} fill={INK} />
                <rect x={x + 1} y={y + 1} width={TILE - 2} height={TILE - 2} fill={WHITE} />
                <Pixels art={tile.art} colours={tile.colours} x={x + 2} y={y + 2} />
              </g>
            );
          })}
          {/* paper over each row, shrinking off it one tile at a time */}
          <rect className="wpv-cover-a" x={GX - 1} y={GY - 1} width={4 * PITCH} height={PITCH} fill={PAPER} />
          <rect className="wpv-cover-b" x={GX - 1} y={GY - 1 + PITCH} width={4 * PITCH} height={PITCH} fill={PAPER} />

          {/* the week's picks */}
          {picks.map(({ x, y }) => (
            <g key={`${x}-${y}`} className="wpv-pick" fill={ACCENT}>
              <rect x={x - 1} y={y - 1} width={TILE + 2} height={1} />
              <rect x={x - 1} y={y + TILE} width={TILE + 2} height={1} />
              <rect x={x - 1} y={y} width={1} height={TILE} />
              <rect x={x + TILE} y={y} width={1} height={TILE} />
            </g>
          ))}

          {/* into the issue */}
          <g className="wpv-arrow">
            <line
              className="wpv-dash"
              x1={56}
              y1={20.5}
              x2={63}
              y2={20.5}
              stroke={ACCENT}
              strokeWidth={1}
              strokeDasharray="2 1"
            />
            <g fill={ACCENT}>
              <rect x={61} y={18} width={1} height={1} />
              <rect x={62} y={19} width={1} height={1} />
              <rect x={63} y={20} width={1} height={1} />
              <rect x={62} y={21} width={1} height={1} />
              <rect x={61} y={22} width={1} height={1} />
            </g>
          </g>

          {/* the issue: a page with the masthead on it from the start */}
          <rect x={66} y={3} width={27} height={34} fill={INK} />
          <rect x={67} y={4} width={25} height={32} fill={WHITE} />
          <g fill={INK}>
            <rect x={69} y={6} width={3} height={1} />
            <rect x={69} y={7} width={1} height={1} />
            <rect x={71} y={7} width={1} height={1} />
            <rect x={69} y={8} width={2} height={1} />
            <rect x={73} y={7} width={14} height={1} />
          </g>
          <rect x={68} y={10} width={23} height={1} fill={RULE} />
          {/* hero: the site's logo ring among the week's topics */}
          <rect x={68} y={12} width={23} height={7} fill={ACCENT} />
          <g fill={WHITE}>
            <rect x={78} y={14} width={3} height={1} />
            <rect x={78} y={15} width={1} height={1} />
            <rect x={80} y={15} width={1} height={1} />
            <rect x={78} y={16} width={3} height={1} />
            <rect x={71} y={13} width={2} height={2} />
            <rect x={74} y={16} width={2} height={2} />
            <rect x={84} y={13} width={2} height={2} />
            <rect x={87} y={16} width={2} height={2} />
          </g>
          {/* takeaways, a heading, and the picks as thumbnails */}
          {[19, 14, 17].map((len, k) => (
            <g key={k}>
              <rect x={68} y={21 + 2 * k} width={1} height={1} fill={ACCENT} />
              <rect x={70} y={21 + 2 * k} width={len} height={1} fill={INK_2} />
            </g>
          ))}
          <rect x={68} y={27} width={11} height={1} fill={INK} />
          {picks.map(({ colour }, k) => (
            <rect key={k} x={68 + 7 * k} y={29} width={6} height={4} fill={colour} />
          ))}
          {/* white paper over the issue (y 9–33), lifting off it in 5px bands. The printed lines
              run y 10–32, so both of its edges sit on blank paper and leave no seam. */}
          <rect className="wpv-cover-page" x={67} y={9} width={25} height={25} fill={WHITE} />

          {/* sent */}
          <g className="wpv-plane">
            <Pixels art={PLANE} colours={{ k: INK, w: WHITE }} x={86} y={0} />
          </g>
        </svg>
      </div>
    </div>
  );
}
