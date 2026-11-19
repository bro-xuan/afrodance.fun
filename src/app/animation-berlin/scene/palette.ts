// Colours for the drawing: soft gouache fills on cream paper, tuned to Berlin
// in summer: sandstone and stucco, red brick, verdigris domes, lime trees in
// full leaf, and the yellow of everything the BVG runs. Every prop picks from
// here.

import { hex, RGB } from "../engine/math";

export const C = {
  ink: hex("#2c2826"),
  inkSoft: hex("#5b534d"),
  white: hex("#fbf8f0"),
  cream: hex("#efe6d0"),
  stone: hex("#e3dccb"),
  stoneDark: hex("#c9bfa9"),

  /** Sandstone: the Gate, the Reichstag, the museums. */
  sand: hex("#ead9b4"),
  sandstone: hex("#dccfae"),
  sandstoneLight: hex("#ebe2c8"),
  sandstoneDark: hex("#c2b28e"),
  /** The cathedral's weathered stone. */
  domStone: hex("#c4b79c"),
  domStoneDark: hex("#a99c82"),
  /** Palace plaster. */
  palace: hex("#f0dc9c"),
  /** Prefabricated concrete, and the TV tower's shaft. */
  concrete: hex("#d3cfc5"),
  concreteDark: hex("#b3aea3"),

  water: hex("#9bcde3"),
  waterDeep: hex("#7cb8d8"),
  waterInk: hex("#5a9cc6"),

  grass: hex("#9bd27c"),
  grassDark: hex("#6fb058"),
  grassLight: hex("#b4e096"),
  hedge: hex("#5f9f55"),
  /** Lime (linden) leaves in June. */
  leaf: hex("#8fce62"),
  leaf2: hex("#7cc054"),
  leaf3: hex("#a9dc7c"),
  leafDark: hex("#4f9146"),
  blossom: hex("#f5b7cc"),
  trunk: hex("#8a6a4c"),

  paving: hex("#f0ebdf"),
  street: hex("#e4d3c5"),
  streetDark: hex("#d2bdac"),
  plaza: hex("#ebe1d0"),
  /** The small granite setts of a Berlin pavement and square. */
  cobble: hex("#d9d2c4"),
  cobbleDark: hex("#b8b0a2"),
  path: hex("#ecdcbb"),
  quay: hex("#cdbf9f"),
  quayDark: hex("#ae9f80"),
  quayCap: hex("#e6dccb"),
  ballast: hex("#b9b2a6"),
  wood: hex("#c99a6a"),
  woodDark: hex("#9a6f48"),

  brick: hex("#b9553e"),
  brickDark: hex("#8f4634"),
  brickBrown: hex("#7a5142"),
  brickRose: hex("#cf8a72"),
  ochre: hex("#dab061"),
  charcoal: hex("#4a454b"),
  slate: hex("#5b5c69"),
  slateLight: hex("#8a8d9b"),
  zinc: hex("#9aa2a8"),
  tile: hex("#b65a43"),
  copper: hex("#7fbfa5"),
  copperDark: hex("#5a9c84"),
  /** Riveted steel: the elevated railway. */
  steel: hex("#5f7068"),
  steelDark: hex("#44524c"),

  glass: hex("#44608a"),
  glassLight: hex("#a8cfe6"),
  glassPale: hex("#d4e8f2"),
  door: hex("#2f5d50"),
  doorRed: hex("#8a2f28"),
  doorBlue: hex("#27456b"),

  red: hex("#dc3d2f"),
  redDark: hex("#a82c22"),
  orange: hex("#f4862a"),
  yellow: hex("#f6c744"),
  gold: hex("#e2b23a"),
  pink: hex("#f08fb0"),
  purple: hex("#a57ad4"),
  lilac: hex("#c5b3e6"),
  blue: hex("#2f6fb7"),
  blueDark: hex("#234f86"),
  sky: hex("#bfe0f3"),
  teal: hex("#3f9c97"),
  green: hex("#3f8f58"),
  black: hex("#2a2728"),
  grey: hex("#a8a49c"),
  greyDark: hex("#77736d"),
  metal: hex("#8f979f"),

  /** Buses, trams and underground trains. */
  bvg: hex("#f3d31c"),
  bvgDark: hex("#c9a90f"),
  /** The S-Bahn's two colours. */
  sbahnRed: hex("#b5262c"),
  sbahnOchre: hex("#e3b04a"),
  /** A German taxi. */
  taxi: hex("#f0e6c0"),
  /** The pipes that carry groundwater away from every building site. */
  pipePink: hex("#ee8fb5"),
  /** The little green man of an eastern pedestrian light. */
  ampelGreen: hex("#3cc46a"),
  ampelRed: hex("#e2483a"),

  lamp: hex("#fff0b8"),

  road: hex("#aeb1b8"),
  roadLine: hex("#f6f3ea"),
  curb: hex("#d9d3c5"),
} as const;

/** Stucco fronts of the old tenements: creams and ochres, a few rose, sage and grey. */
export const HOUSE: RGB[] = [
  hex("#efe3c2"),
  hex("#e6cf8e"),
  hex("#f1dd9a"),
  hex("#e0b9a4"),
  hex("#d99f84"),
  hex("#c9d4b4"),
  hex("#c6cfd6"),
  hex("#e7e2d6"),
  hex("#cf9070"),
  hex("#bdb7ab"),
  hex("#ead0a8"),
  hex("#d8c4a0"),
];

export const ROOF: RGB[] = [hex("#a8553f"), hex("#6a6470"), hex("#8d949c"), hex("#9c5140"), hex("#5b5c69")];
export const DOOR: RGB[] = [hex("#2f5d50"), hex("#8a2f28"), hex("#27456b"), hex("#2a2728"), hex("#6b4a32")];

export const SKIN: RGB[] = [hex("#f6d3b8"), hex("#eebb96"), hex("#d39a6c"), hex("#a8724c"), hex("#6f4630")];
export const HAIR: RGB[] = [
  hex("#2b2019"),
  hex("#4a3020"),
  hex("#7c5230"),
  hex("#c99a55"),
  hex("#e3c27c"),
  hex("#b24e30"),
  hex("#1c1a1c"),
  hex("#d9d5cf"),
];
export const SHIRT: RGB[] = [
  hex("#dc3d2f"),
  hex("#f4862a"),
  hex("#f6c744"),
  hex("#3f8f58"),
  hex("#2f6fb7"),
  hex("#7fb6e0"),
  hex("#a57ad4"),
  hex("#f08fb0"),
  hex("#fbf8f0"),
  hex("#4a454b"),
  hex("#3f9c97"),
  hex("#c7785a"),
  hex("#ece2c8"),
  hex("#2a2728"),
  hex("#2a2728"),
  hex("#8fa3b8"),
];
export const TROUSERS: RGB[] = [hex("#2f3b55"), hex("#3c3a3d"), hex("#6f5d4d"), hex("#264d6b"), hex("#7d8c99"), hex("#b9a98c"), hex("#2a2728")];

/** Flowers for beds and window boxes. */
export const TULIP: RGB[] = [hex("#e5443a"), hex("#f6c744"), hex("#f08fb0"), hex("#a57ad4"), hex("#ffffff"), hex("#f4862a")];
export const AWNING: RGB[] = [hex("#dc3d2f"), hex("#f6c744"), hex("#3f8f58"), hex("#2f6fb7"), hex("#f4862a")];
export const BOAT: RGB[] = [hex("#fbf8f0"), hex("#2f6fb7"), hex("#dc3d2f"), hex("#3f8f58"), hex("#f6c744"), hex("#4a454b"), hex("#c99a6a")];

/** Car colours: German streets are mostly black, silver and white, with a few bright ones. */
export const CAR: RGB[] = [hex("#3c3a3d"), hex("#c9cdd1"), hex("#f4f1ea"), hex("#2f4f7a"), hex("#d9483b"), hex("#8f979f"), hex("#3f8f58"), hex("#f4862a")];
/** A Trabant came in very few colours, all of them pastel. */
export const TRABI: RGB[] = [hex("#a9d3e6"), hex("#bfe0c4"), hex("#f0e2b8"), hex("#f2c9a0")];

/** Spray paint. */
export const GRAFFITI: RGB[] = [hex("#f08fb0"), hex("#3f9c97"), hex("#f6c744"), hex("#a57ad4"), hex("#dc3d2f"), hex("#2f6fb7"), hex("#9bd27c"), hex("#f4862a")];

/** Germany's flag, bottom band first (as flag() wants them), and Berlin's. */
export const FLAG_DE: RGB[] = [hex("#f2c11c"), hex("#d62a23"), hex("#262223")];
export const FLAG_BERLIN: RGB[] = [hex("#d62a23"), hex("#fbf8f0"), hex("#fbf8f0"), hex("#fbf8f0"), hex("#d62a23")];
export const FLAG_EU: RGB[] = [hex("#2b4c9b")];
