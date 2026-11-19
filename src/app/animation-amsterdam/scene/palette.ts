// Colours for the Amsterdam drawing: soft gouache fills on cream paper, with
// the city's brick reds, canal greens and the red-black-red of its flag.

import { hex, RGB } from "../engine/math";

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

  paving: hex("#f2ede2"),
  street: hex("#e4d3c5"),
  streetDark: hex("#d2bdac"),
  plaza: hex("#ebe1d0"),
  sand: hex("#ead9b4"),
  path: hex("#ecdcbb"),
  quay: hex("#c9a68b"),
  quayDark: hex("#a98871"),
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
  tile: hex("#c0563f"),
  copper: hex("#7fbfa5"),
  copperDark: hex("#5a9c84"),

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

  lamp: hex("#fff0b8"),
} as const;

/** Wall colours for canal houses: mostly brick, a few painted. */
export const HOUSE: RGB[] = [
  hex("#b9553e"),
  hex("#9c4a37"),
  hex("#7a5142"),
  hex("#c7785a"),
  hex("#d9ad62"),
  hex("#e9dfc8"),
  hex("#4f484d"),
  hex("#a8b9c4"),
  hex("#cf8a72"),
  hex("#8f9f86"),
  hex("#c9a37f"),
  hex("#b06a4e"),
];

export const ROOF: RGB[] = [hex("#5b5c69"), hex("#4b4a55"), hex("#b65a43"), hex("#6a6470"), hex("#9c5140")];
export const DOOR: RGB[] = [hex("#2f5d50"), hex("#8a2f28"), hex("#27456b"), hex("#2a2728"), hex("#3f6f5c")];

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

export const TULIP: RGB[] = [hex("#e5443a"), hex("#f6c744"), hex("#f08fb0"), hex("#a57ad4"), hex("#ffffff"), hex("#f4862a")];
export const AWNING: RGB[] = [hex("#dc3d2f"), hex("#f6c744"), hex("#3f8f58"), hex("#2f6fb7"), hex("#f4862a")];
export const BOAT: RGB[] = [hex("#fbf8f0"), hex("#2f6fb7"), hex("#dc3d2f"), hex("#3f8f58"), hex("#f6c744"), hex("#4a454b"), hex("#c99a6a")];
