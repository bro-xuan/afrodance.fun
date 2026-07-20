// Original pixel-art critters, hand-authored in the site's palette.
// Each sprite is a small grid: rows of characters, one char per pixel.
// A char maps to a palette color; "." (and space) is transparent.
// 1-frame sprites animate purely via CSS transforms (hop/float/bob).
// 2-frame sprites also alternate frames for a walk/flap cycle.
//
// These are original mascots, NOT reproductions of any existing characters.

export const SPRITE_PALETTE: Record<string, string> = {
  k: "#2d2d2d", // outline / dark
  w: "#ffffff", // white
  g: "#92cc41", // light green
  G: "#6aad30", // green
  D: "#4a7c10", // dark green
  c: "#cfe8a0", // pale leaf green
  b: "#3498db", // blue
  B: "#1a7abb", // dark blue
  y: "#f7d51d", // yellow
  o: "#e6b800", // gold
  r: "#e76e55", // coral
  R: "#d44332", // red
  p: "#7e3f9b", // purple
  P: "#e88aa8", // pink (blush)
  s: "#f2e2c4", // cream shadow
  n: "#9c6b3f", // brown
  t: "#35c0b0", // teal
  l: "#cdd6da", // light gray
  S: "#8a969c", // gray
  e: "#ef8c2b", // orange
};

export type SpriteDef = {
  /** One or two frames. Two frames alternate for a walk/flap cycle. */
  frames: string[][];
};

// Slime — a round green blob. One frame; CSS gives it a squash-hop.
export const slime: SpriteDef = {
  frames: [
    [
      "...kkkkk...",
      "..kgGGGgk..",
      ".kGGGGGGGk.",
      "kGGkGGGkGGk",
      "kGGGGGGGGGk",
      "kPGGGGGGGPk",
      ".kGGGGGGGk.",
      "..kk...kk..",
    ],
  ],
};

// Chick — a round yellow bird with folded wings. Two frames swap the feet
// so it looks like it's toddling as it moves.
export const chick: SpriteDef = {
  frames: [
    [
      "...kkkkk...",
      "..kyyyyyk..",
      ".kyyyyyyyk.",
      "kyykyyykyyk",
      "kyyyyoyyyyk",
      "kyoyyyyyoyk",
      ".kyyyyyyyk.",
      "...oo.oo...",
    ],
    [
      "...kkkkk...",
      "..kyyyyyk..",
      ".kyyyyyyyk.",
      "kyykyyykyyk",
      "kyyyyoyyyyk",
      "kyoyyyyyoyk",
      ".kyyyyyyyk.",
      "..oo...oo..",
    ],
  ],
};

// Robot — a boxy blue bot with antennae. Two frames swap the feet for a walk.
export const robot: SpriteDef = {
  frames: [
    [
      "..o.....o..",
      "..k.....k..",
      ".kkkkkkkkk.",
      ".kbwbbbwbk.",
      ".kbbbbbbbk.",
      ".kBBBBBBBk.",
      ".kbkbkbkbk.",
      ".kkkkkkkkk.",
      "..k.....k..",
      ".kk.....kk.",
    ],
    [
      "..o.....o..",
      "..k.....k..",
      ".kkkkkkkkk.",
      ".kbwbbbwbk.",
      ".kbbbbbbbk.",
      ".kBBBBBBBk.",
      ".kbkbkbkbk.",
      ".kkkkkkkkk.",
      "..k.....k..",
      "..kk...kk..",
    ],
  ],
};

// Ghost — a floaty white spook. Two frames wiggle the scalloped tail.
export const ghost: SpriteDef = {
  frames: [
    [
      "..kkkkk..",
      ".kwwwwwk.",
      "kwwwwwwwk",
      "kwkwwwkwk",
      "kwwwwwwwk",
      "kwwwwwwwk",
      "kwkwkwkwk",
      "..k.k.k..",
    ],
    [
      "..kkkkk..",
      ".kwwwwwk.",
      "kwwwwwwwk",
      "kwkwwwkwk",
      "kwwwwwwwk",
      "kwwwwwwwk",
      "kwwkwkwwk",
      ".k.k.k.k.",
    ],
  ],
};

// Sprout — an acorn-ish seedling with a leaf. Two frames sway the leaf
// and swap the feet for a gentle idle shuffle.
export const sprout: SpriteDef = {
  frames: [
    [
      "....D....",
      "..ccD....",
      "...cD....",
      "..kkkkk..",
      ".kDDDDDk.",
      "kkkkkkkkk",
      "koooooook",
      "kokoookok",
      "koooooook",
      ".kk...kk.",
    ],
    [
      "....D....",
      "....Dcc..",
      "....Dc...",
      "..kkkkk..",
      ".kDDDDDk.",
      "kkkkkkkkk",
      "koooooook",
      "kokoookok",
      "koooooook",
      "..kk.kk..",
    ],
  ],
};

// Butterfly — small, 2 frames flap wings (blue upper, purple lower).
export const butterfly: SpriteDef = {
  frames: [
    [
      "..b..k..b..",
      ".bbb.k.bbb.",
      "bbbbbkbbbbb",
      "bpbbbkbbbpb",
      ".bbbbkbbbb.",
      "..pppkppp..",
      "...ppkpp...",
      "....kkk....",
    ],
    [
      "b....k....b",
      ".bb..k..bb.",
      "..bbbkbbb..",
      "..bpbkbpb..",
      "...bbkbb...",
      "...ppkpp...",
      "...ppkpp...",
      "....kkk....",
    ],
  ],
};

// Bee — tiny, 2 frames flap. Yellow body, black stripes, stinger.
export const bee: SpriteDef = {
  frames: [
    [
      "..w.w....",
      ".wwwww...",
      "kykykyko.",
      "kykykyk..",
      ".kkkkk...",
      ".k...k...",
    ],
    [
      ".........",
      "..w.w....",
      "kykykyko.",
      "kykykyk..",
      ".kkkkk...",
      ".k...k...",
    ],
  ],
};

// Fish — medium, 2 frames swish tail. Faces left (mouth left).
export const fish: SpriteDef = {
  frames: [
    [
      ".....kkkk...",
      "...kkbbbbk.k",
      "..kbbbbbbbkk",
      ".kbwbbbbbbkk",
      "kBbbbbbbbbkk",
      ".kbbbbbbbbkk",
      "..kbbbbbbbk.",
      "...kkbbbbk..",
    ],
    [
      ".....kkkk.k",
      "...kkbbbbkk",
      "..kbbbbbbbk",
      ".kbwbbbbbbk",
      "kBbbbbbbbbk",
      ".kbbbbbbbbk",
      "..kbbbbbbbkk",
      "...kkbbbbk.k",
    ],
  ],
};

// Frog — medium, one frame; CSS gives it a hover leap. Green, big eyes.
export const frog: SpriteDef = {
  frames: [
    [
      ".kk.....kk.",
      "kGwk...kwGk",
      "kGkk...kkGk",
      "kGGkkkkkGGk",
      "kGGGGGGGGGk",
      "kGkkkkkkkGk",
      ".kGGGGGGGk.",
      "kk.kk.kk.kk",
    ],
  ],
};

// Mushroom — small, one frame. Red cap, white spots, cream stem with eyes.
export const mushroom: SpriteDef = {
  frames: [
    [
      "..RRRRR..",
      ".RRwRRwR.",
      "RRRRRRRRR",
      "RRwRRRRwR",
      ".RRRRRRR.",
      "..sssss..",
      "..sksks..",
      "..sssss..",
      "..s...s..",
    ],
  ],
};

// Star — small, one frame with a face. Spins on scroll / hover.
export const star: SpriteDef = {
  frames: [
    [
      "....o....",
      "....o....",
      "..ooooo..",
      "ooooooooo",
      ".okoooko.",
      "..ooooo..",
      ".oo.o.oo.",
      "o..o.o..o",
    ],
  ],
};

// Cat — large, one frame (front sit). Waves on hover. Coral fur, pink nose.
export const cat: SpriteDef = {
  frames: [
    [
      "k.k.....k.k",
      "krk.....krk",
      "krrkkkkkrrk",
      "krrrrrrrrrk",
      "krwrrkrrwrk",
      "krrrPPrrrrk",
      "kkrrrrrrrkk",
      ".krrrrrrrk.",
      ".krrrrrrrk.",
      ".krwrrrwrk.",
      ".kkk.k.kkk.",
    ],
  ],
};

// Dino — large, 2 frames walk legs. Green, back spikes, tiny arm.
export const dino: SpriteDef = {
  frames: [
    [
      ".........kkkk",
      "........kGGGGk",
      "kk......kGwGGk",
      "kGk....kGGGGGk",
      "kGGkkkkGGGGk.",
      ".kGGGGGGGGGk.",
      ".kGGGGGGGGGGk",
      "kGGGGGGGGGGGk",
      ".kGGGGGGGGGk.",
      ".kGkGGGGkGk..",
      ".kk...kkk....",
    ],
    [
      ".........kkkk",
      "........kGGGGk",
      "kk......kGwGGk",
      "kGk....kGGGGGk",
      "kGGkkkkGGGGk.",
      ".kGGGGGGGGGk.",
      ".kGGGGGGGGGGk",
      "kGGGGGGGGGGGk",
      ".kGGGGGGGGGk.",
      ".kGGkGGkGGk..",
      "..kk.kk......",
    ],
  ],
};

// UFO — medium, one frame. Floats / peeks / beams. Gray saucer, teal beam.
export const ufo: SpriteDef = {
  frames: [
    [
      "....kkkkk....",
      "...klwwwlk...",
      "..kllwwwllk..",
      ".kSSSSSSSSSk.",
      "kSoSoSoSoSoSk",
      ".kSSSSSSSSSk.",
      "...ttt.ttt...",
      "..t..t.t..t..",
    ],
  ],
};

// Emote bubbles — tiny sprites that pop above an interactive critter on hover.
export const emoteHeart: SpriteDef = {
  frames: [
    [
      ".RR.RR.",
      "RRRRRRR",
      "RRRRRRR",
      ".RRRRR.",
      "..RRR..",
      "...R...",
    ],
  ],
};

export const emoteBang: SpriteDef = {
  frames: [
    [".y.", ".y.", ".y.", ".y.", "...", ".y."],
  ],
};

export const emoteSparkle: SpriteDef = {
  frames: [
    ["..y..", "..y..", "yywyy", "..y..", "..y.."],
  ],
};

export const SPRITES = {
  slime,
  chick,
  robot,
  ghost,
  sprout,
  butterfly,
  bee,
  fish,
  frog,
  mushroom,
  star,
  cat,
  dino,
  ufo,
};

export const EMOTES = {
  heart: emoteHeart,
  bang: emoteBang,
  sparkle: emoteSparkle,
};
