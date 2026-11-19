// Colours for the London drawing: soft gouache fills on cream paper, with
// Portland stone, yellow stock brick, soot and tarmac, and the red of buses,
// phone boxes and guardsmen.

import { RGB, hex } from "../engine/math";

export const C = {
  ink: hex("#2c2826"),
  inkSoft: hex("#5b534d"),
  white: hex("#fbf8f0"),
  cream: hex("#efe6d0"),
  stone: hex("#e3dccb"),
  stoneDark: hex("#c9bfa9"),

  water: hex("#9ccbea"),
  waterDeep: hex("#7fb6e0"),
  waterInk: hex("#5d9bd0"),

  grass: hex("#9bd27c"),
  grassDark: hex("#6fb058"),
  grassLight: hex("#b4e096"),
  hedge: hex("#5f9f55"),
  leaf: hex("#86cb68"),
  leaf2: hex("#74bd5c"),
  leaf3: hex("#a2d882"),
  leafDark: hex("#4d8c47"),
  blossom: hex("#f5b7cc"),
  trunk: hex("#8a6a4c"),

  // the ground
  paving: hex("#f2ede2"),
  flag: hex("#ece6d8"), // paving flags
  flagDark: hex("#d3ccbc"),
  street: hex("#e4d3c5"),
  streetDark: hex("#d2bdac"),
  tarmac: hex("#cbc7c2"),
  tarmacDark: hex("#b4afa9"),
  roadLine: hex("#fbf8f0"),
  yellowLine: hex("#e9bb3d"),
  busLane: hex("#c98778"),
  cycleLane: hex("#7fb2de"),
  mallRed: hex("#c7705e"),
  plaza: hex("#ebe1d0"),
  sand: hex("#ead9b4"),
  gravel: hex("#e6d6b0"),
  path: hex("#ecdcbb"),
  ballast: hex("#b9b2a6"),
  wood: hex("#c99a6a"),
  woodDark: hex("#9a6f48"),

  // stone and brick
  portland: hex("#ebe5d6"),
  portlandDark: hex("#d0c8b5"),
  portlandLight: hex("#f6f2e7"),
  bath: hex("#e3cf9f"), // honey-coloured gothic stone
  bathDark: hex("#c4ad79"),
  bathLight: hex("#f1e3bd"),
  stock: hex("#cdab72"), // yellow London stock brick
  stockDark: hex("#aa8a55"),
  soot: hex("#7d6a5c"),
  brick: hex("#b9553e"),
  brickDark: hex("#8f4634"),
  brickBrown: hex("#7a5142"),
  brickRose: hex("#cf8a72"),
  stucco: hex("#f4efe2"),
  granite: hex("#bdb6ac"),
  graniteDark: hex("#9d968c"),
  graniteCap: hex("#e2dccf"),
  clay: hex("#b98b63"), // what the city stands on
  clayDark: hex("#9a7150"),
  clayLight: hex("#d0a37a"),
  ochre: hex("#dab061"),
  charcoal: hex("#4a454b"),
  slate: hex("#5b5c69"),
  slateLight: hex("#8a8d9b"),
  tile: hex("#c0563f"),
  lead: hex("#8f9ba8"),
  copper: hex("#7fbfa5"),
  copperDark: hex("#5a9c84"),
  bronze: hex("#6c8a74"),

  glass: hex("#44608a"),
  glassLight: hex("#a8cfe6"),
  glassPale: hex("#d4e8f2"),
  door: hex("#2f5d50"),
  doorRed: hex("#8a2f28"),
  doorBlue: hex("#27456b"),

  // paintwork
  red: hex("#dc3d2f"),
  redDark: hex("#a82c22"),
  busRed: hex("#d8352b"),
  busRedDark: hex("#a9281f"),
  guard: hex("#c9332b"),
  cab: hex("#2d2c31"),
  orange: hex("#f4862a"),
  yellow: hex("#f6c744"),
  gold: hex("#e2b23a"),
  hivis: hex("#d7e84a"),
  pink: hex("#f08fb0"),
  purple: hex("#a57ad4"),
  lilac: hex("#c5b3e6"),
  blue: hex("#2f6fb7"),
  blueDark: hex("#234f86"),
  navy: hex("#27345a"),
  royal: hex("#2b4c94"),
  sky: hex("#bfe0f3"),
  teal: hex("#3f9c97"),
  green: hex("#3f8f58"),
  ironGreen: hex("#3f6b57"),
  bridgeBlue: hex("#7fb7d9"),
  bridgeGreen: hex("#5d9a78"),
  iron: hex("#35363b"),
  black: hex("#2a2728"),
  grey: hex("#a8a49c"),
  greyDark: hex("#77736d"),
  metal: hex("#8f979f"),
  tubeBlue: hex("#2c4f9e"),
  neonPink: hex("#f25fa3"),
  neonBlue: hex("#59b6ee"),

  lamp: hex("#fff0b8"),
} as const;

/** Union flag colours. */
export const UK_BLUE: RGB = hex("#27408b");
export const UK_RED: RGB = hex("#cf2a2a");

/** Brick and stucco for terraces. */
export const TERRACE: RGB[] = [hex("#cdab72"), hex("#c39a63"), hex("#b9553e"), hex("#a65842"), hex("#8a6b58"), hex("#d6b98a"), hex("#f4efe2"), hex("#c7785a")];
/** The ice-cream colours of a Notting Hill street. */
export const PASTEL: RGB[] = [hex("#f6c9d2"), hex("#bfe0ec"), hex("#fbe7a8"), hex("#c8e6c2"), hex("#d9c8ee"), hex("#f9d3b0"), hex("#fbf8f0"), hex("#a9d6d2")];
export const ROOF: RGB[] = [hex("#5b5c69"), hex("#4b4a55"), hex("#6a6470"), hex("#77736d")];
/** Front doors. */
export const DOOR: RGB[] = [hex("#22262c"), hex("#8a2f28"), hex("#27456b"), hex("#2f5d50"), hex("#e2b23a"), hex("#6b4a7c"), hex("#1f4f49")];
/** Shop fascias. */
export const FASCIA: RGB[] = [hex("#2f5d50"), hex("#27456b"), hex("#8a2f28"), hex("#22262c"), hex("#6b4a7c"), hex("#c98b2e"), hex("#3f9c97")];
/** Car paint. */
export const CAR: RGB[] = [hex("#8fa3b8"), hex("#fbf8f0"), hex("#4a454b"), hex("#2f6fb7"), hex("#3f8f58"), hex("#c7785a"), hex("#f6c744"), hex("#a8a49c"), hex("#7fb6e0")];

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
  hex("#8fa3b8"),
];
export const TROUSERS: RGB[] = [hex("#2f3b55"), hex("#3c3a3d"), hex("#6f5d4d"), hex("#264d6b"), hex("#7d8c99"), hex("#b9a98c")];

export const AWNING: RGB[] = [hex("#dc3d2f"), hex("#f6c744"), hex("#3f8f58"), hex("#2f6fb7"), hex("#f4862a")];