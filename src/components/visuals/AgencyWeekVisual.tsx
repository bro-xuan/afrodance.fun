/**
 * Animated pixel-art scene for Paper Kite, the agency section under the intro.
 *
 * On the left, a business owner's phone shows this week's suggested posts one
 * at a time: a latte for a café, a bouquet for a florist, a shopfront with its
 * awning out. Each gets a tap on the green approve button, lifts off the phone
 * and hops in steps to its suggested slot on the week on the right: Monday on
 * Instagram, Wednesday on TikTok, Friday on Facebook, each with its channel's
 * colour under it. Once all three are in, the phone says the week is set and
 * hearts pop up over the posts, one after another. Loop is 8s. Pure SVG + CSS
 * keyframes (see globals.css, "Paper Kite (AgencyWeekVisual)"); the base frame
 * is the third post on the phone and the whole week with its hearts, which is
 * what prefers-reduced-motion gets. Server-rendered, no JS shipped.
 */
import type { ReactElement } from "react";

type Bitmap = string[];

const PAPER = "#f3eee4";
const WHITE = "#ffffff";
const INK = "#22201c";
const INK_2 = "#4a463f";
const LINE = "#bdb4a4";
const RULE = "#e4ddd0";
const SLOT = "#f1ece2";
const WEEKEND = "#faf6ef";
const SHADOW = "#ddd5c6";
const TANGERINE = "#f2a65a";
/** The site's own greens: approve, pressed, and the ring round the tap. */
const GO = "#92cc41";
const GO_PRESSED = "#6aad30";
const GO_DARK = "#4a7c10";
const HEART = "#e8567a";
const CHANNEL = { instagram: "#e1306c", tiktok: INK, facebook: "#1877f2" };

export interface Post {
  /** The class suffix its screen, its tile and its heart share in globals.css. */
  key: "a" | "b" | "c";
  /** 18×13: the photo on the phone. */
  photo: Bitmap;
  /** 5×5: the same post on the week. */
  mini: Bitmap;
  colours: Record<string, string>;
  /** The widths of its two caption lines under the photo. */
  caption: [number, number];
  /** Its channel, shown as the strip under its tile. */
  channel: string;
  /** Its suggested slot: the day's column (0 is Monday) and the tile's top row. */
  day: number;
  y: number;
}

export const POSTS: Post[] = [
  {
    // a latte on a café table
    key: "a",
    photo: [
      "......s...s.......",
      ".......s...s......",
      "......s...s.......",
      "....oooooooooo....",
      "....okkckckkko....",
      "....owwwwwwwgoooo.",
      "....owwwwwwwgo..o.",
      "....owwwwwwwgoooo.",
      ".....owwwwwgo.....",
      "...wwwwwwwwwwww...",
      "TTTTqqqqqqqqqqTTTT",
      "tttttttttttttttttt",
      "ttdttttttttdtttttt",
    ],
    mini: ["bbbbb", "bkkkb", "bwwww", "bwwwb", "ttttt"],
    colours: {
      ".": "#f1e4cd", // wall
      s: "#fffaf2", // steam
      o: "#5a4636", // the cup's outline
      k: "#7a4a24", // coffee
      c: "#c89a62", // crema
      w: WHITE, // cup and saucer
      g: "#e2dacb", // the cup's shaded side
      q: "#d4c9b6", // under the saucer
      T: "#c98f55", // the table's edge
      t: "#b07a45", // table
      d: "#94623a", // grain
      b: "#e9cfa6", // the tile's wall
    },
    caption: [16, 11],
    channel: CHANNEL.instagram,
    day: 0,
    y: 20,
  },
  {
    // a bouquet in a pot on a florist's shelf
    key: "b",
    photo: [
      ".......ooo........",
      "..ppp..oyo........",
      "..pyp..ooo...ppp..",
      "..ppp...g....pyp..",
      "...g....g.g..ppp..",
      "...gg..gg.g...g...",
      "....g...gg...gg...",
      "....gggggggggg....",
      "....rrrrrrrrrr....",
      ".....RrrrrrrR.....",
      ".....RrrrrrrR.....",
      "......RrrrrR......",
      "tttttttttttttttttt",
    ],
    mini: ["pbobp", "bgbgb", "bbgbb", "brrrb", "brrrb"],
    colours: {
      ".": "#f6dde2", // wall
      p: "#e8567a", // pink petals
      o: TANGERINE, // tangerine petals
      y: "#f7d51d", // flower hearts
      g: "#4f8a3a", // stems and leaves
      r: "#c8643c", // pot
      R: "#a24e2c", // the pot's shade
      t: "#e3cfb0", // shelf
      b: "#f4c4cf", // the tile's wall
    },
    caption: [14, 9],
    channel: CHANNEL.tiktok,
    day: 2,
    y: 28,
  },
  {
    // a shopfront with its awning out
    key: "c",
    photo: [
      "..................",
      ".ffffffffffffffff.",
      ".fkkyyykyykyyykkf.",
      ".ffffffffffffffff.",
      ".owwoowwoowwoowwo.",
      ".owwoowwoowwoowwo.",
      ".ofwfofwfofwfofwf.",
      ".fmmmmmmmffmmmmff.",
      ".fmbBbbbmffmddmff.",
      ".fmbbBbbmffmddmff.",
      ".fmbbbbbmffmdnmff.",
      ".fmmmmmmmffmddmff.",
      "pppppppppppppppppp",
    ],
    mini: ["owowo", "fffff", "fbfdf", "fbfdf", "ppppp"],
    colours: {
      ".": "#cfe3f2", // sky
      f: "#efe6d6", // facade
      k: INK, // sign
      y: "#f7d51d", // its letters
      o: TANGERINE, // awning
      w: WHITE, // awning
      m: "#5a4636", // frames
      b: "#9cc6e4", // glass
      B: "#d8ecf8", // a shine on it
      d: "#2e4b9b", // door
      n: "#f7d51d", // knob
      p: "#b9b1a3", // pavement
    },
    caption: [15, 12],
    channel: CHANNEL.facebook,
    day: 4,
    y: 22,
  },
];

/** The phone's body, and the screen inside it. */
const PHONE = { x: 4, y: 1, w: 24, h: 38 };
const SCREEN = { x: 6, y: 4, w: 20, h: 31 };
/** The photo's top-left corner on the screen. */
const PHOTO_X = 7;
const PHOTO_Y = 9;

/** The week: a card, seven 7px day columns on an 8px pitch, letters over a rule, the body under it. */
const CAL = { x: 33, y: 3, w: 58, h: 34 };
export const COL0 = 34;
export const PITCH = 8;
export const COL_W = 7;
export const BODY_TOP = 13;
export const BODY_BOTTOM = 35;
export const tileX = (day: number) => COL0 + day * PITCH + 1;

/** Where every post lifts off the phone: its 5×6 tile centred on the photo. */
export const LIFT = { x: 14, y: 12 };

// Letters for the days, Monday first: five rows, as wide as they need to be, centred in their column.
const LETTERS: Record<string, Bitmap> = {
  M: ["#...#", "##.##", "#.#.#", "#...#", "#...#"],
  T: ["###", ".#.", ".#.", ".#.", ".#."],
  W: ["#...#", "#...#", "#.#.#", "##.##", "#...#"],
  F: ["###", "#..", "##.", "#..", "#.."],
  S: [".##", "#..", ".#.", "..#", "##."],
};
const WEEK = "MTWTFSS";

const CHECK: Bitmap = ["....#", "#..#.", ".##.."];
const CROSS: Bitmap = ["#.#", ".#.", "#.#"];
const BIG_CHECK: Bitmap = [
  "........#",
  ".......##",
  "#.....##.",
  "##...##..",
  ".##.##...",
  "..###....",
  "...#.....",
];
/** 5×4, over its post with two rows to spare, so it can rise 2px without touching it. */
export const HEART_ART: Bitmap = [".#.#.", "#####", ".###.", "..#.."];

/** A bitmap drawn from (x, y), one rect per run of a colour along each row; unknown characters stay clear. */
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

/** A post on the week: its 5×5 picture, its channel's strip under it, and a 1px shadow. */
function Tile({ post }: { post: Post }) {
  const x = tileX(post.day);
  return (
    <>
      <rect x={x + 5} y={post.y + 1} width={1} height={5} fill={SHADOW} />
      <rect x={x + 1} y={post.y + 6} width={5} height={1} fill={SHADOW} />
      <Pixels art={post.mini} colours={post.colours} x={x} y={post.y} />
      <rect x={x} y={post.y + 5} width={5} height={1} fill={post.channel} />
    </>
  );
}

export default function AgencyWeekVisual() {
  return (
    <div className="relative w-full shrink-0">
      <div className="border-4 border-[#2d2d2d] bg-[#f3eee4]">
        <svg viewBox="0 0 96 40" className="block h-auto w-full" shapeRendering="crispEdges" aria-hidden="true">
          <rect x="0" y="0" width="96" height="40" fill={PAPER} />

          {/* the owner's phone, corners rounded off */}
          <rect x={PHONE.x} y={PHONE.y} width={PHONE.w} height={PHONE.h} fill={INK} />
          <g fill={PAPER}>
            <rect x={PHONE.x} y={PHONE.y} width={1} height={1} />
            <rect x={PHONE.x + PHONE.w - 1} y={PHONE.y} width={1} height={1} />
            <rect x={PHONE.x} y={PHONE.y + PHONE.h - 1} width={1} height={1} />
            <rect x={PHONE.x + PHONE.w - 1} y={PHONE.y + PHONE.h - 1} width={1} height={1} />
          </g>
          <rect x={13} y={2} width={6} height={1} fill={INK_2} />
          <rect x={12} y={36} width={8} height={1} fill={INK_2} />
          <rect x={SCREEN.x} y={SCREEN.y} width={SCREEN.w} height={SCREEN.h} fill={WHITE} />

          {/* the app's header: the studio's avatar and name */}
          <rect x={7} y={5} width={3} height={3} fill={TANGERINE} />
          <rect x={8} y={6} width={1} height={1} fill={INK} />
          <rect x={11} y={6} width={9} height={1} fill={INK_2} />
          <rect x={21} y={6} width={4} height={1} fill={LINE} />

          {/* this week's suggestions, one at a time */}
          {POSTS.map((post) => (
            <g key={post.key} className={`awv-screen-${post.key}`}>
              <Pixels art={post.photo} colours={post.colours} x={PHOTO_X} y={PHOTO_Y} />
              <rect x={7} y={23} width={post.caption[0]} height={1} fill={LINE} />
              <rect x={7} y={25} width={post.caption[1]} height={1} fill={LINE} />
            </g>
          ))}

          {/* approve and skip */}
          <rect x={7} y={28} width={12} height={5} fill={GO} />
          <Pixels art={CHECK} colours={{ "#": WHITE }} x={10} y={29} />
          <rect x={20} y={28} width={5} height={5} fill="#ece6da" />
          <Pixels art={CROSS} colours={{ "#": INK_2 }} x={21} y={29} />

          {/* the tap: the button goes down, its check with it, and a ring shows round it */}
          <g className="awv-press">
            <rect x={7} y={28} width={12} height={5} fill={GO_PRESSED} />
            <Pixels art={CHECK} colours={{ "#": WHITE }} x={10} y={30} />
          </g>
          <g className="awv-ring" fill={GO_DARK}>
            <rect x={6} y={27} width={14} height={1} />
            <rect x={6} y={33} width={14} height={1} />
            <rect x={6} y={28} width={1} height={5} />
            <rect x={19} y={28} width={1} height={5} />
          </g>

          {/* the week is set: a big check, a line of text, one square per post on its channel */}
          <g className="awv-done">
            <rect x={SCREEN.x} y={8} width={SCREEN.w} height={SCREEN.y + SCREEN.h - 8} fill={WHITE} />
            <Pixels art={BIG_CHECK} colours={{ "#": GO_DARK }} x={11} y={12} />
            <rect x={8} y={22} width={16} height={1} fill={LINE} />
            <rect x={10} y={24} width={12} height={1} fill={LINE} />
            {POSTS.map((post, i) => (
              <rect key={post.key} x={10 + 4 * i} y={27} width={3} height={3} fill={post.channel} />
            ))}
          </g>

          {/* the week, with a shadow like the site's boxes */}
          <rect x={CAL.x + 1} y={CAL.y + CAL.h} width={CAL.w} height={1} fill={SHADOW} />
          <rect x={CAL.x + CAL.w} y={CAL.y + 1} width={1} height={CAL.h} fill={SHADOW} />
          <rect x={CAL.x} y={CAL.y} width={CAL.w} height={CAL.h} fill={INK} />
          <rect x={CAL.x + 1} y={CAL.y + 1} width={CAL.w - 2} height={CAL.h - 2} fill={WHITE} />
          <g fill={WEEKEND}>
            {[5, 6].map((day) => (
              <rect key={day} x={COL0 + day * PITCH} y={BODY_TOP} width={COL_W} height={BODY_BOTTOM - BODY_TOP + 1} />
            ))}
          </g>
          <g fill={RULE}>
            {Array.from({ length: 6 }, (_, i) => (
              <rect key={i} x={COL0 + i * PITCH + COL_W} y={BODY_TOP} width={1} height={BODY_BOTTOM - BODY_TOP + 1} />
            ))}
            <rect x={COL0} y={BODY_TOP - 1} width={CAL.w - 2} height={1} />
          </g>
          {[...WEEK].map((letter, day) => (
            <Pixels
              key={day}
              art={LETTERS[letter]}
              colours={{ "#": day < 5 ? INK_2 : LINE }}
              x={COL0 + day * PITCH + Math.floor((COL_W - LETTERS[letter][0].length) / 2)}
              y={6}
            />
          ))}
          {/* the suggested slots, waiting for a yes */}
          <g fill={SLOT}>
            {POSTS.map((post) => (
              <rect key={post.key} x={tileX(post.day)} y={post.y} width={5} height={6} />
            ))}
          </g>

          {/* the posts: each lifts off the phone and hops to its slot */}
          {POSTS.map((post) => (
            <g key={post.key} className={`awv-post-${post.key}`}>
              <Tile post={post} />
            </g>
          ))}

          {/* and the hearts that come in once they're out */}
          {POSTS.map((post) => (
            <g key={post.key} className={`awv-heart-${post.key}`}>
              <Pixels art={HEART_ART} colours={{ "#": HEART }} x={tileX(post.day)} y={post.y - 6} />
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}
