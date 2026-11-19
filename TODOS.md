# TODOS

## Market Intel (/marketintel)

- **Add tests for the Fed odds maths and the Polymarket slug matching**
  **Priority:** P2
  `src/app/api/marketintel/fed/route.ts` turns fed funds futures into move odds and `polymarket/route.ts` picks markets by slug regex. Both break silently if inputs shift (a new FOMC year, a renamed Polymarket slug). Vitest is set up (`npm test`); pull the FedWatch maths and the slug regexes into `_lib/` like `_lib/ladder.ts` so they can be tested.

- **Re-tune pulse weights against the track record**
  **Priority:** P2
  Each hourly sample in Redis (`marketintel:pulse:v1`) stores every read's score, not just the three totals. After a few months, fit the per-horizon weights in `src/app/marketintel/lib/signals.ts` against forward returns, then bump `MODEL` so old and new scoring aren't graded together.

- **Fill the Binance-only gaps on Cloudflare**
  **Priority:** P2
  Binance answers 451/403 to every Cloudflare egress IP (they geolocate to the US whatever the Worker's placement), and Bitget 403s too. Still missing as a result: the Binance and Bitget rows in the venue table (so total OI and the liquidation map's all-venue scale undercount by roughly a third), the Binance long/short and taker ratios, the funding and OI percentiles (`leverageContext` in `src/app/marketintel/lib/quant.ts` reads Binance's funding and OI history only; Bybit has `/v5/market/funding/history` and 1d OI), and the perp CVD line. Found by /ship on feat/cloudflare-workers, 2026-11-12.

- **Coinbase premium label when Binance is down**
  **Priority:** P3
  `derivatives/route.ts` falls back to Bybit spot for the premium's reference price, but `signals.ts` still says "Coinbase above/below Binance". Name the venue that was actually used.

- **Add the 2027 second half FOMC dates**
  **Priority:** P3
  `src/app/api/marketintel/_lib/fomc.ts` lists meetings through June 2027. Append the rest when the Fed publishes them, or the Fed panel and calendar run dry.

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

- **Align "View articles" button label with "Writing" section title**
  **Priority:** P3
  From /design-review (2026-07-22): the hero CTA says "View articles" but the section it scrolls to is titled "Writing". Pick one word and use it in both places.

- **Decide on one primary hero CTA**
  **Priority:** P4
  From /design-review (2026-07-22): the three hero buttons (green/blue/yellow) carry equal visual weight, so no action reads as primary. Consider keeping "View projects" loud and demoting the other two to outline style. Taste call — the color chaos is arguably on-brand.

- **Reconcile Twitter bird icon with "X / Twitter" label**
  **Priority:** P4
  From /design-review (2026-07-22): hero/footer use the pre-2023 bird icon while the contact button says "X / Twitter". If the bird is intentional retro, keep it — just make it a decision, not an accident.

- **Even out Writing card rhythm**
  **Priority:** P4
  From /design-review (2026-07-22): one Writing card has an italic subtitle and the other doesn't, and both show the same date (Jun 9, 2026), which reads as placeholder-ish. Add a subtitle to both or neither.

## Amsterdam (/animation-amsterdam)

- **Link the page from the home page**
  **Priority:** P2
  `/animation-amsterdam` is live but nothing points to it. A card in `src/data/projects.ts` needs its own pixel-art scene in `src/components/visuals/` (every card has one, and `projects.test.ts` checks it). Found by /ship on feat/amsterdam-animation, 2026-11-19.

- **Try it on Safari, Firefox and a phone**
  **Priority:** P2
  It was built and checked in Chromium on an M3 only. The shaders were read for GLSL ES 3.00 problems but never compiled anywhere else. Things to look at on real devices: the page starts at all, pinch zooms the map and not the page (desktop Safari sends `gesturechange`, handled in `amsterdam.ts` but untested), coming back to a backgrounded tab on iOS, and frame rate on a mid-range phone.

- **Build the city off the main thread if phones stall**
  **Priority:** P3
  `buildCity` runs when the page mounts: about a quarter of a second on an M3, likely a second or more on a mid-range phone, with the paper and title already on screen. If a real device shows a long freeze, build in a Worker and transfer the four typed arrays, or yield between blocks.

- **Sound for the film**
  **Priority:** P4
  The page and the recorded video are silent. Water, bicycle bells, a street organ at the Dam and a tram would suit it; it has to start muted and only on a tap.

## London (/animation-london)

- **Link the page from the home page**
  **Priority:** P2
  `/animation-london` is live but nothing points to it, the same as Amsterdam. One card for both films may be enough; it needs its own pixel-art scene in `src/components/visuals/` (`projects.test.ts` checks every card has one). Found by /ship on feat/london-animation, 2026-11-19.

- **Try it on Safari, Firefox and a phone**
  **Priority:** P2
  Built and checked in Chromium on an M3 only, where it holds 60 fps at 2880×1800. London is the heavier of the two films (about 250,000 fills and 200,000 strokes, 165 kB of code gzipped, about a quarter of a second to build the city on the M3), so a mid-range phone is the first thing to try: does the page start, how long does it freeze while the city is built and the traffic worked out (both happen before the first frame), and what frame rate does the tour hold. In the wide view about 79,000 fill vertices and 46,000 strokes of moving things are sent to the GPU every frame, 2.3 times what Amsterdam sends, and the depth range is a quarter wider than Amsterdam's, which matters on a phone with a 16-bit depth buffer (look for windows flickering against their walls). The rest of Amsterdam's list applies here too (pinch on desktop Safari, coming back to a backgrounded tab on iOS).

- **Give Amsterdam the phone title fix**
  **Priority:** P3
  On a phone-width screen the title and "drawn in code" ran under the afrodance.fun link in the other corner. London's stylesheet stacks the two lines below 40rem; Amsterdam's still has the overlap, and the same rule in `animation-amsterdam/animation.module.css` fixes it.

- **One engine for both films**
  **Priority:** P3
  London carries its own copy of the engine (`engine/`, `film.ts`, and the general parts of `scene/kit.ts`, `motion.ts`, `boats.ts`), on purpose: Amsterdam was already live and was left untouched. London's copy has since gained things Amsterdam's lacks (neon that glows in its own colour, digits in the lettering, traffic that queues). Before a third city, move the shared part to one place and point both films at it.

- **The controls lie over Greenwich in the wide view**
  **Priority:** P4
  With the whole city in view, the hint and the two buttons in the bottom right corner sit on top of the Greenwich island until they fade (they fade when the pointer rests). Either keep a strip clear along the bottom the way the top is kept clear for the title, or move the island.

- **Sound for the film**
  **Priority:** P4
  Silent, like Amsterdam. Big Ben already strikes on cue; a bus, the river, a busker and the fireworks would suit it. It has to start muted and only on a tap.

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

- **Remove the Vercel leftovers**
  **Priority:** P4
  The site runs on Cloudflare Workers now. `vercel.json` and the `preferredRegion` / `maxDuration` exports in `src/app/api/marketintel/*/route.ts` do nothing there. Delete them once nothing is expected to go back to Vercel, and disconnect the Vercel GitHub integration so PRs stop getting failed Vercel checks.

## Writing

- **Add more Substack posts**
  **Priority:** P3
  The Writing section has 2 articles; it will feel fuller with 3-4.

## Completed

- **Muted text WCAG AA contrast** — `--muted-foreground` darkened `#777777 → #595959` (~4.4:1 → ~7:1). Fixed by /design-review on main, 2026-07-22 (`6a41a86`).
- **44px tap areas on social icon links** — anchors in `SocialLinks.tsx` now have a `min-h-11 min-w-11` centered hit area; icons stay 32px. Fixed by /design-review on main, 2026-07-22 (`44a88aa`).
