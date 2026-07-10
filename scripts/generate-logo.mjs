/**
 * Generate the afrodance.fun pixel logo SVGs.
 *
 * The mark is a 16×16 pixel-art grid (NES/8-bit brand, brand green #6aad30).
 * The active logo is a pixel portrait with the signature glasses — the same
 * identity as the hero selfie — set on a soft cream tile so it stays legible in
 * both light and dark browser tabs.
 *
 * This script owns the pixel maps + a run-length SVG renderer and writes:
 *   - src/app/icon.svg                (active browser-tab favicon, vector)
 *   - public/logo/afrodance-*.svg     (active + alternate concepts)
 *
 * To switch the tab logo, change ACTIVE below and re-run:  node scripts/generate-logo.mjs
 *
 * The RASTER set (favicon.ico, apple-icon.png, public/icon-192|512.png) is NOT
 * produced here — it needs a headless-Chromium render of the SVG at a large
 * size, then an integer box-downsample (so pixels stay crisp) into a PNG/ICO.
 * Re-run that step only when the artwork changes; the committed rasters already
 * match the SVGs below. (iconMap/squareMap/toSVG are exported for that step.)
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

export const ACTIVE = "face"; // "face" | "terminal" | "dancer"

export const PALETTE = {
  g: "#6aad30", l: "#92cc41", d: "#3f6f12", s: "#2b4d0a",
  w: "#fbf7ec", c: "#efe6d2", C: "#faf8f2", F: "#d5e7b4", E: "#eef5df",
  b: "#209cee", y: "#f7d51d", o: "#e0a100", r: "#e76e55",
  k: "#e6ad8c", j: "#c07f5e", h: "#3a2c22", x: "#241f1a",
};

// Pixel portrait with the signature glasses (transparent background).
const faceRaw = [
  "................",
  ".....xxxxxx.....",
  "...xxxxxxxxxx...",
  "..xxkkkkkkkkxx..",
  "..xkkkkkkkkkkx..",
  "..xkkkkkkkkkkx..",
  "..kxxxxxxxxxxk..",
  "..kxkkxkkxkkxk..",
  "..kxxxxkkxxxxk..",
  "..kkkkkkkkkkkk..",
  "..kkkkkkkkkkkk..",
  "...kkkkkkkkkk...",
  "....kkkkkkkk....",
  ".....kkkkkk.....",
  "................",
  "................",
];

// Soft cream tile with a light-green border (rounded, 2px corner cut). The
// portrait is composited on top so the mark reads as an avatar chip.
const FRAME = [
  "..FFFFFFFFFFFF..",
  ".FCCCCCCCCCCCCF.",
  "FCCCCCCCCCCCCCCF",
  "FCCCCCCCCCCCCCCF",
  "FCCCCCCCCCCCCCCF",
  "FCCCCCCCCCCCCCCF",
  "FCCCCCCCCCCCCCCF",
  "FCCCCCCCCCCCCCCF",
  "FCCCCCCCCCCCCCCF",
  "FCCCCCCCCCCCCCCF",
  "FCCCCCCCCCCCCCCF",
  "FCCCCCCCCCCCCCCF",
  "FCCCCCCCCCCCCCCF",
  "FCCCCCCCCCCCCCCF",
  ".FCCCCCCCCCCCCF.",
  "..FFFFFFFFFFFF..",
];

// Green rounded tile with a cream chevron + underscore cursor ( >_ ).
const terminal = [
  "..gggggggggggg..",
  ".gllllllllllllg.",
  "gglgggggggggggd.",
  "gggggggggggggdd.",
  "ggggwgggggggggd.",
  "ggggwwgggggggggd",
  "gggggwwggggggggd",
  "ggggggwwgggggggd",
  "gggggwwggggggggd",
  "ggggwwgggggggggd",
  "ggggwgggwwwwgggd",
  "ggggggggwwwwgggd",
  "gggggggggggggddd",
  "ggdgggggggggddd.",
  ".gddddddddddddg.",
  "..dddddddddddd..",
];

// Afro dancer, arms up (transparent background).
const dancer = [
  "................",
  ".....hhhhhh.....",
  "....hhhhhhhh....",
  "....hhkkkkhh....",
  "....hhkkkkhh....",
  ".....kkkkkk.....",
  "...kk.rrrr.kk...",
  "..kk.rrrrrr.kk..",
  ".....rrrrrr.....",
  ".....rrrrrr.....",
  ".....rrrrrr.....",
  ".....bbbbbb.....",
  ".....bb..bb.....",
  "....bb....bb....",
  "...xx......xx...",
  "................",
];

export const CONCEPTS = { terminal, dancer, face: faceRaw };

// Composite `over` on top of `base`; any non-transparent cell in `over` wins.
function composite(base, over) {
  return base.map((row, y) =>
    [...row].map((ch, x) => (over[y][x] !== "." ? over[y][x] : ch)).join("")
  );
}

const solid = (fill) => Array.from({ length: 16 }, () => fill.repeat(16));

// The map used for the browser-tab favicon (transparent corners allowed).
export function iconMap(name) {
  if (name === "face") return composite(FRAME, faceRaw);
  return CONCEPTS[name];
}

// Full-bleed square map for iOS / Android icons (the platform masks corners),
// so transparent backgrounds are filled with a solid brand tint.
export function squareMap(name) {
  if (name === "face") return composite(solid("E"), faceRaw);
  if (name === "dancer") return composite(solid("E"), dancer);
  return composite(solid("g"), terminal); // terminal already tiled
}

// Render a pixel map to SVG, merging same-color horizontal runs into one rect.
export function toSVG(map, px) {
  const n = map.length;
  let rects = "";
  for (let y = 0; y < n; y++) {
    const row = map[y];
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      if (ch === ".") { x++; continue; }
      let run = 1;
      while (x + run < row.length && row[x + run] === ch) run++;
      rects += `<rect x="${x}" y="${y}" width="${run}" height="1" fill="${PALETTE[ch] || "#f0f"}"/>`;
      x += run;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges" role="img" aria-label="afrodance.fun">${rects}</svg>`;
}

// Write files only when run directly (not when imported by the raster step).
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
  mkdirSync(join(ROOT, "public/logo"), { recursive: true });
  writeFileSync(join(ROOT, "src/app/icon.svg"), toSVG(iconMap(ACTIVE), 16) + "\n");
  writeFileSync(join(ROOT, "public/logo/afrodance-face.svg"), toSVG(iconMap("face"), 128) + "\n");
  writeFileSync(join(ROOT, "public/logo/afrodance-terminal.svg"), toSVG(iconMap("terminal"), 128) + "\n");
  writeFileSync(join(ROOT, "public/logo/afrodance-dancer.svg"), toSVG(iconMap("dancer"), 128) + "\n");
  console.log(`Wrote src/app/icon.svg (active: ${ACTIVE}) + public/logo/afrodance-*.svg`);
}
