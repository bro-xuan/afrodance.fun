# afrodance.fun — pixel logo

The site mark is a **16×16 pixel-art tile** drawn to match the NES/8-bit brand
(Press Start 2P, brand green `#6aad30`). The active logo is a terminal prompt
(`>_`) — a nod to the hero's blinking `_` cursor and the "building on the
internet" tagline — and it stays legible right down to a 16px browser tab.

## Where the favicon lives (Next.js App Router auto-detects these)

| File | Surface |
| --- | --- |
| `src/app/icon.svg` | Browser tab (modern browsers, vector — crisp at any size) |
| `src/app/favicon.ico` | Legacy tab / bookmarks (16 · 32 · 48px) |
| `src/app/apple-icon.png` | iOS home screen (180px, full-bleed) |
| `public/icon-192.png`, `public/icon-512.png` | Android / PWA (via `src/app/manifest.ts`) |

`theme_color` (manifest) and the `viewport.themeColor` in `src/app/layout.tsx`
are both brand green `#6aad30`.

## Alternate concepts

Two other designs were explored and are kept here as SVGs:

- `afrodance-terminal.svg` — **active** logo.
- `afrodance-dancer.svg` — an afro dancing figure (most literal to "afrodance",
  but shrinks at true 16px because of transparent margins).
- `afrodance-face.svg` — Stefan's pixel identity with the signature glasses,
  matching the hero selfie.

## Swapping the active logo

The pixel maps and renderer live in `scripts/generate-logo.mjs`. To switch the
tab logo, change `ACTIVE` in that script and re-run it to regenerate
`src/app/icon.svg` and the SVGs here:

```bash
node scripts/generate-logo.mjs
```

Regenerating the raster set (`favicon.ico`, `apple-icon.png`, `icon-*.png`)
additionally requires a headless-Chromium render + downsample step; see the
script header for notes.
