/**
 * Generate the afrodance.fun pixel logo SVGs.
 *
 * The mark is a 16×16 pixel-art grid (NES/8-bit brand, brand green #6aad30).
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
 * match the SVGs below.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const ACTIVE = "terminal"; // "terminal" | "dancer" | "face"

const PALETTE = {
  g: "#6aad30", l: "#92cc41", d: "#3f6f12", s: "#2b4d0a",
  w: "#fbf7ec", c: "#efe6d2",
  b: "#209cee", y: "#f7d51d", o: "#e0a100", r: "#e76e55",
  k: "#e6ad8c", j: "#c07f5e", h: "#3a2c22", x: "#241f1a",
};

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

// Pixel face with the signature glasses (transparent background).
const face = [
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

const CONCEPTS = { terminal, dancer, face };

// Render a pixel map to SVG, merging same-color horizontal runs into one rect.
function toSVG(map, px) {
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

mkdirSync(join(ROOT, "public/logo"), { recursive: true });

writeFileSync(join(ROOT, "src/app/icon.svg"), toSVG(CONCEPTS[ACTIVE], 16) + "\n");
for (const [key, map] of Object.entries(CONCEPTS)) {
  writeFileSync(join(ROOT, `public/logo/afrodance-${key}.svg`), toSVG(map, 128) + "\n");
}

console.log(`Wrote src/app/icon.svg (active: ${ACTIVE}) + public/logo/afrodance-*.svg`);
