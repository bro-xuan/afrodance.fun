# TODOS

## Portfolio (home page)

- **Restore the Date Scoring project card**
  **Priority:** P2
  The card linked to `/date-scoring` but no such route exists (visitors got a 404), so it's commented out in `src/data/projects.ts`. Build the page or point the card at a live deployment, then un-comment it.

- **Re-audit subpages at large viewports after fluid root font-size**
  **Priority:** P2
  `html { font-size: clamp(16px, 1.15vw, 24px) }` is global. Dense subpages (china-migration, NLHousebuying) mix fixed `text-[10px]` labels with rem-based sizes — at 1920/2880px widths the hierarchy can invert. Do a visual pass and normalize to rem where it looks off.

- **Render stack tags on project cards**
  **Priority:** P3
  `projects.ts` has a `stack` field per project (Next.js, Vapi, etc.) that is never displayed. Small muted chips under the description would add credibility.

- **Hero "PRESS START" typed-text effect**
  **Priority:** P4
  Type the tagline character-by-character on load (respecting prefers-reduced-motion) to push the retro feel further.

## Code health

- **Fix pre-existing ESLint errors in subpages**
  **Priority:** P1
  `npm run lint` reports 9 problems, all outside the home page: 5 errors (react-hooks/set-state-in-effect in `NLHousebuying/components/panels/MortgagePanel.tsx`, `RentVsBuyPanel.tsx`, and `corperate_translator/page.tsx`; prefer-const in `NLHousebuying/calculations/recommendation.ts`) and 4 warnings (unused vars, missing useEffect deps in `china-migration/components/MigrationMap.tsx`). Found by /ship on design/gradient-scroll-polish, 2026-07-03.

- **Layer the NES.css import so Tailwind utilities win the cascade**
  **Priority:** P2
  `layout.tsx` imports `nes.css/css/nes.min.css` unlayered, so its bare element rules (e.g. `p { margin-bottom: 1rem }`) outrank every Tailwind v4 layered utility — margin utilities on `p`/headings silently don't apply. Fix: move the import into `globals.css` as `@import "nes.css/css/nes.min.css" layer(base);`, then do a full visual pass — several spacings were tuned around the broken cascade and will shift.

- **Pause off-screen critter animations**
  **Priority:** P3
  From /ship adversarial review (2026-07-20): the ~24 time-based `critter-*` and `sprite-frame-a/b` animations run `infinite` regardless of viewport visibility, so they keep the compositor busy (and drain battery) while scrolled off-screen. Gate `animation-play-state` on an IntersectionObserver, or tie the idle loops to `animation-timeline: view()` so they only run in view. Purely a power/perf optimization — no visual change.

- **Polish scroll-motion edge cases**
  **Priority:** P3
  From /ship adversarial review (2026-07-03): (1) elements whose reveal range straddles the initial scroll position render mid-step (partial opacity) until the first scroll — consider `entry 0%` range start or accepting; (2) the Konami body shake makes `body` a containing block for 0.6s, so the fixed XP bar jumps during the shake — move the shake to a wrapper if it bothers; (3) rem-sized dither/grass tiles land on fractional device pixels at some fluid-root sizes on 1x displays, causing hairline seams.

## Writing

- **Add more Substack posts**
  **Priority:** P3
  The Writing section has 2 articles; it will feel fuller with 3-4.

## Completed
