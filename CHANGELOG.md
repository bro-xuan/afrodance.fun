# Changelog

All notable changes to afrodance.fun are documented here.
Format: `## [MAJOR.MINOR.PATCH.MICRO] - YYYY-MM-DD`

## [0.5.3.0] - 2026-10-19

### Added
- **Six more machines in 3D of Everything**, nineteen in all, each with real insides, a step-by-step "How it works" tour, live charts and experiments:
  - **Personal cassette player.** The shell opens on the tape transport: motor, belt, flywheel, a 2 mm capstan and pinch roller, the slip clutch and the cassette's reels. Run it and the capstan holds the tape at 4.76 cm/s while the reels speed up and slow down as their packs change.
  - **Pin tumbler lock.** A Kwikset KW1 cylinder in a deadbolt, built in code. Push the key in and the five pin stacks ride its cuts; try the right key, a wrong one or none, and a cutaway chart marks any pin left across the shear line.
  - **Desk lamp.** An Anglepoise-type arm whose springs match the head's weight at every angle. Move either arm and the weight's torque and the springs' stay equal on the chart; unhook the springs and it drops.
  - **Sewing machine.** A Singer 201-2 built in code from Singer's adjuster's manual. Turn the wheel and the hook goes round twice for every stitch, carrying each loop of the top thread right round the bobbin: the stitch is a lock, not a knot.
  - **Fire extinguisher.** A 3.3 kg dry-powder extinguisher cut open: about 35 g of nitrogen at 9.6 bar pushes the powder up a dip tube. Pull the pin and squeeze, and the gauge and the powder fall together over about 11 seconds; hold it upside down and only the gas comes out.
  - **Tape measure.** A 3 m tape opened up. Pull the blade out and the spring winds 20 turns tighter; press the lock and a shoe pinches the blade; run it out unsupported until it folds; and watch the loose hook slide its own 0.9 mm, so pushed and hooked readings both come out true.
- A new **Sound & music** category in the gallery.

## [0.5.2.0] - 2026-10-19

### Changed
- **The 3D of Everything page, redesigned.** `/3d-of-everything` now reads like a technical drawing sheet: each section opens with its heading beside a short summary, and the content sits in ruled cells instead of one long column.
  - **The pocket watch at the top is no longer cut off.** It's drawn across the whole hero, so it can swing and come apart past its box, and the tagline's column is wider.
  - **For any coding agent, not only Claude Code.** The page names the agents `npx skills add` installs into, Claude Code, Codex, Cursor, Gemini CLI and GitHub Copilot among them, with a new question on which agents it works with.
  - **Point at a machine in the collection to see it taken apart.** The closed watch sits beside its insides, each prompt tier shows an example machine and its time budget, the build times are a bar chart (the table is still under it), and installing is three steps with copy buttons.
  - **Slowing the watch reads "0.3 beats a second"**, not 0.30000000000000004.
- **The homepage card says "a skill for coding agents"** instead of "a Claude Code skill".

## [0.5.1.0] - 2026-10-18

### Added
- **3D of Everything on the homepage.** A new project card with its own pixel scene: a pocket watch takes itself apart into case, mainspring, wheels, balance and dial, the wheels turn while a red line follows the power from the crown, then it closes up and ticks. It holds still on the exploded view under reduced motion.

## [0.5.0.1] - 2026-10-18

### Fixed
- **`/3d-of-everything` shows the skill's page again, not the gallery.** Vercel answers a folder with its `index.html` before any rewrite, and the gallery was that file; now the skill's page is the folder's `index.html` and the gallery `objects/index.html`.

## [0.5.0.0] - 2026-10-18

### Added
- **3D of Everything at `/3d-of-everything`.** Real machines you can turn over, look inside and take apart in 3D, made with 3D of Things, a Claude Code skill:
  - **The skill's page** at `/3d-of-everything`, with the pocket watch running live at the top: hold W to wind it, S slows time to a twentieth, E takes it apart.
  - **Thirteen machines** at `/3d-of-everything/objects`, from a pocket watch, a Leica M3 and a Hasselblad-style SLR to the 2026 Roadster, a family car and a washing machine, each with a step-by-step "How it works" tour, live charts and experiments.
  - **Install the skill** with `npx skills add bro-xuan/3d-of-things` and name a machine; the source is on GitHub under MIT.
  - Baked in as static files by `npm run export` in bro-xuan/3d-of-things; two rewrites in `next.config.ts` give the clean URLs.

## 2026-10-11, Market Intel: real flows, desk levels, live macro

- **Liquidations that actually happened:** last 1h/4h/24h longs vs shorts liquidated (OKX fills scaled to all venues), hourly bars, the largest fills, and a live tape streaming Bybit and Binance liquidations into the page.
- **Perp CVD next to spot CVD** on the 1H chart, and a new read comparing spot and perp taker flow: spot-led moves are organic, perp-led ones tend to fade.
- **Funding and OI in context:** where funding sits among the last 90 days of prints and OI among the last 30 days.
- **Desk levels:** weekly and monthly VWAPs, 30-day volume profile (POC, value area), previous week high/low, the newest open CME gap, short-term-holder cost basis and realized price, and the Deribit gamma flip with call and put walls (replacing max pain).
- **Live cross-asset tape:** dollar, 10Y, Nasdaq and S&P futures and gold, plus how tightly BTC is trading with Nasdaq, the dollar and gold right now. A new pulse read turns today's equity and dollar moves into a BTC tailwind or headwind, weighted by that correlation.
- **More macro:** 10Y real yield, 2Y yield, SOFR − IORB funding stress, and the Treasury account and reverse repo on their own.

## 2026-10-11, Market Intel: check a trade

- **New "Check a trade" section.** Pick long or short and a horizon (and optionally your entry), and the page answers with: whether the pulse agrees, the reads for and against your trade, a stop just beyond the nearest chart level against you, the next two levels as targets, reward to risk and the breakeven win rate, options-implied odds of touching the target and the stop within the horizon, and the high-impact events landing before it ends.
- Warnings for the usual mistakes: a stop inside half a normal day's move, a stop more likely than not to be tagged, reward under risk, a liquidation pool between entry and stop, trading against the pulse, and an event inside an intraday window.

## 2026-10-11, Market Intel: bias by horizon, with a track record

- **The pulse now gives three biases, Intraday, Swing and Macro, instead of one blended number.** Each read counts only toward the horizons it informs, with its weight shown on its card, so a bullish intraday tape no longer cancels out bearish multi-week ETF flows.
- **New reads:** daily trend (vs the 200D and 50D, 20-day momentum in vol units), 24h tape (spot vs VWAP plus net taker buying, flags rallies without buyers), and liquidity/dollar/rates (net liquidity, stablecoins, dollar, 10Y).
- **Track record:** every hour the three scores are logged with BTC's price and later graded against the next 24h, 7 days and 30 days. Shows hit rate next to how often always-long would have been right, average return after bullish vs bearish calls, and the honest sample size. Hours with too few live reads are left out.
- **Key levels** now include the 50D and 200D averages.
- Falling open interest into a move now counts against it (short covering, capitulation) instead of being ignored.
- Polymarket ladders drop stale quotes that break the odds ordering (e.g. a $74K "above" at 53% under a $78K at 94%).

## 2026-10-11, Market Intel upgrade

- **Market pulse now gives one weighted net bias (−100 to +100)** instead of counting votes. Each read is scored against its normal range, so noise like near-zero funding no longer shows up as "bullish". Cards say whether a read is a flow, leverage, options, crowd or odds signal and whether it's contrarian.
- **New pulse reads:** options skew (25-delta risk reversal), 3-month futures basis, and Polymarket touch odds compared with what options imply.
- **Expected move:** 1-day and 7-day expected range from implied vol, implied vs realized vol, and term-structure shape.
- **New Price & levels section:** 1H and 1D candles with spot CVD, plus previous day high/low, 7-day range, weekly and monthly open, liquidation clusters, max pain and ±1σ lines, with a distance-from-spot ladder.
- **New Volatility & term structure section:** ATM implied vol, skew, butterfly, futures basis and options OI for every Deribit expiry.
- 24h high/low in the top bar; nav jumps no longer hide section titles under the header.

## [0.4.0.0] - 2026-10-11

### Added
- **Market Intel, a BTC trading monitor at `/marketintel`.** One white page with everything a trader checks before a position:
  - **Market pulse:** eight one-line reads (funding, OI regime, Binance positioning, ETF flows, Coinbase premium, nearby liquidations, Polymarket skew, Fear and Greed).
  - **Positioning:** open interest across Binance, Bybit, OKX, Hyperliquid, Bitget and Deribit; 48h OI in BTC vs price; OI change by venue; funding by venue; who is long.
  - **Liquidation map:** estimated liquidation levels within ±15% of spot, with the densest pools above and below.
  - **ETF flows:** 30 sessions of US spot ETF net flows (Farside) under the BTC daily close, plus the latest session by fund.
  - **Prediction markets:** Polymarket BTC markets that roll to the next market automatically (daily close ranges, "above" odds, weekly/monthly/yearly touch odds), CPI and Fed cuts.
  - **Fed rate odds:** next three FOMC meetings, CME FedWatch method on live fed funds futures next to Polymarket.
  - **Catalyst calendar:** FOMC, CPI, jobs, PCE, NVIDIA earnings, options expiries and this week's US releases, in the viewer's time zone.
  - **Macro and sentiment:** net liquidity, stablecoins, dollar, 10Y, equities, VIX, DVOL, dominance, options max pain.

## [0.3.3.0] - 2026-08-27

### Changed
- **Bottom indicator split into four routes** instead of one long page:
  - `/bottom_indicator` — gauge, verdict, bottom/top watch panels and "Go deeper" cards.
  - `/bottom_indicator/signals` — every signal, grouped and ranked.
  - `/bottom_indicator/cycle` — timing charts: 4-year overlay, drawdown from ATH, monthly seasonality.
  - `/bottom_indicator/valuation` — price-level charts: score-colored price, log regression bands,
    200W SMA / support band, 2-year MA multiplier.
- Shared `PageShell` (header, sticky section nav, provenance footer) and a `summary()` helper so each
  page computes the headline numbers the same way. `CycleCharts` became `CycleTimingCharts` and
  `ValuationCharts`, each still a single client boundary. Per-route `metadata` for titles/descriptions.

## [0.3.2.0] - 2026-08-27

### Added
- **Six more cycle charts on the BTC bottom/top indicator**, after a sweep of
  Into The Cryptoverse, LookIntoBitcoin, Bitbo and Checkonchain for the charts
  that actually speak to "where are we in the cycle":
  - **Drawdown from ATH** with each bear-market floor labelled (−80% / −83% /
    −77%) and stat tiles: drawdown, days since ATH, average past-bear length
    and floor.
  - **Price color-coded by cycle score** — the page's own 0–100 score painted
    onto weekly price history (Cowen's "risk" view). Backed by a new
    `data/score-history.json` of per-signal weekly scores that the daily job
    fills in as it rotates through the registry.
  - **Logarithmic regression bands** — log-log OLS trend since genesis with
    0.5 / 10 / 90 / 99.5 % residual bands (fit parameters shown under the chart).
  - **2-year MA multiplier (Investor Tool)** — 2-year MA and 5× it.
  - **Monthly returns heatmap** with per-month average and hit-rate rows
    (seasonality).
  - **ROI after halving** as a third view on the cycle overlay, plus a
    halving table.
- All charts now live behind one client boundary (`CycleCharts`) so the
  weekly data crosses the server→client boundary once.

### Changed
- `cycles.json` gained halving epochs, bear-market table, regression fit,
  monthly returns, a 2-day-sampled daily series and the 2-year MA column; cycle
  ROI series are now sampled every 2nd day (half the payload, same picture).

## [0.3.1.0] - 2026-08-27

### Added
- **Cycle charts on the BTC bottom/top indicator.** Two interactive charts
  (Benjamin Cowen–style) sit between the gauge and the signal table:
  - **4-year cycle overlay** — every cycle re-based to its bear-market low
    and drawn on one "days since the low" axis (2011 / 2015 / 2018 / 2022
    cycles), with the prior-bottom window (day 1,431 & 1,437) shaded and a
    "day N" marker on the current cycle. Toggle to *Drawdown from peak* to see
    the same cycles aligned on their tops.
  - **Support band & 200-week SMA** — weekly close with the 20W SMA / 21W EMA
    band (Bull Market Support / Bear Market Resistance) and the 200-week SMA,
    with a plain-English regime line ("above the band, +24% vs 200W") and 2y /
    4y / all ranges.
  Both are dependency-free SVG, server-rendered with a client crosshair +
  tooltip, keyboard-focusable, and backed by a `<details>` table view.
- `scripts/fetch-indicators.mjs` now also writes
  `src/app/bottom_indicator/data/cycles.json`, merging blockchain.info daily
  history (2010→) with Binance closes (2017→). Costs no bitcoin-data.com
  budget; the daily workflow commits it alongside the indicator snapshot.

## [0.3.0.1] - 2026-07-22

### Changed
- **More readable body text.** The muted gray used for project descriptions,
  section subtitles, and the intro bio darkened from `#777777` to `#595959` —
  contrast goes from ~4.4:1 (below WCAG AA) to ~7:1, with the soft retro look
  intact.
- **Easier-to-tap social icons.** The GitHub / X / LinkedIn icon links now have
  a 44px minimum tap area (the icons themselves stay 32px), meeting Apple/WCAG
  touch-target guidance on phones.

## [0.3.0.0] - 2026-07-20

### Added
- **Pixel-art critters bring the page to life.** Original, hand-built pixel
  mascots now live in the gutters of every section and on the hero's grass —
  a cat that waves back when you hover it, a dino pacing the far side, a robot
  and chick on patrol, a ghost drifting, a butterfly on a loopy flight path,
  plus a bee, fish, frog, mushroom, slime, sprout, star and UFO. About 25 in
  all, sized from tiny to large. Some come alive on a timer (walking, hopping,
  floating, fluttering, buzzing, swimming); some react to scroll (walking
  sideways, spinning, rising, peeking up on entry); and a few pop a little
  emote bubble (a heart or sparkle) when you hover them. All are decorative
  vector SVG, so they stay crisp at any size, add no image downloads, and hide
  themselves on small screens and from screen readers. Every animation freezes
  under `prefers-reduced-motion` and when printing.

## [0.2.3.1] - 2026-07-07

### Changed
- **Live BTC price in the bottom/top indicator header.** The header quote was
  a daily *close* baked into the static snapshot, so it read as a live price
  while lagging spot by hours. It's now a small client-side ticker that fetches
  a real-time spot on load and polls every 30s (Binance, falling back to
  CoinGecko — both keyless and CORS-enabled), with a pulsing **Live** dot and a
  brief green/amber tint on each up/down tick. The scoring is untouched — it
  still runs on the daily-close snapshot. If both price sources are
  unreachable the header gracefully shows the snapshot close, labelled
  "close · <date>", so it is never blank or misleading.

## [0.2.3.0] - 2026-07-07

### Changed
- **BTC Bottom Indicator → BTC Bottom & Top Indicator.** The page now reads
  the whole cycle, not just the floor:
  - **New signal: Pi Cycle Top** (111-day MA vs 2× the 350-day MA), computed
    locally from the Binance feed — the crossover that called the 2013, 2017
    and 2021 blow-off tops within days. Zero extra API budget.
  - **Signal sidedness.** Every signal now declares which extreme it can call
    (`both` / `bottom` / `top`). The headline gauge averages only the 13
    two-sided signals; one-sided specialists (Pi Cycle Bottom, Hash Ribbons,
    Pi Cycle Top) are excluded from all averages — their blind-side reading
    is noise — and carry a `bottom-only` / `top-only` badge in the table.
  - **Bottom watch / Top watch panels.** A pair of cards counting how
    many signals sit in each extreme zone (score < 20 / ≥ 80), chips naming
    the ones firing, and a distance-to-fire meter for each specialist trigger
    (all three pivot on their ratio crossing 1.00, so an approaching Pi Cycle
    cross is visible before it happens).
  - Signal blurbs rewritten to describe both extremes; page copy, metadata,
    and the projects card reframed around 0 = past bottoms, 100 = past tops.

### Fixed
- `fetch:indicators` no longer clobbers previously-good price-derived rows
  with "unavailable" when the Binance price source is temporarily unreachable
  — it keeps the prior snapshot rows (stale beats blank). The snapshot also
  refreshes name/blurb/side from the registry on every run, so copy changes
  no longer wait for a refetch.
- Tailwind's `flex` utility was silently dead on the dashboard's `<header>`,
  `<section>`, and `<footer>` elements: nes.css ships an unlayered normalize
  (`header { display: block }`) that outranks Tailwind's layered utilities.
  A scoped override restores them — this also fixes the signal-group headers,
  whose average badge had been wrapping below the title instead of sitting
  right-aligned.

## [0.2.2.0] - 2026-07-05

### Changed
- **BTC Bottom Indicator — redesigned for clarity and polish.** The bare
  "19 / 100" is replaced by a **semicircular valuation gauge** (the Fear-&-Greed
  silhouette) with a needle, so a first-time reader instantly sees *where* the
  score sits on the cheap→expensive scale. Added a plain-language **verdict**
  ("Historically cheap. At 19/100, Bitcoin sits deep in its Deep Value zone…"),
  a **consensus tally** + **conviction bar** showing how the 15 signals
  distribute across zones, and a **"how to read this"** strip — all generated
  from the live data, so they stay correct as the snapshot refreshes.
- **Valuation colour semantics.** Green = historically cheap / accumulate,
  red = expensive / distribute (was an ambiguous orange→blue temperature ramp).
  Every zone now carries a word + action so meaning never rests on colour alone.
  Zones relabelled to a valuation ladder: Deep Value / Value / Fair Value /
  Premium / Overheated (internal phase keys and thresholds unchanged).
- **Dark "control-room" theme** for the page, consistent with the site's dark
  editorial pages, and the 15 signals are now **grouped by category**
  (Valuation · On-chain / Miner stress / Price & trend models) with a
  shared-axis dot meter per row so clustering is visible at a glance.

## [0.2.1.0] - 2026-07-05

### Added
- **BTC Bottom Indicator** — six more key bottom signals, closing the three
  categories the basket was missing:
  - _Miner:_ **Puell Multiple** and **Hash Ribbons** (30d/60d hashrate SMA
    ratio) — previously no miner coverage at all.
  - _Price anchors:_ **Mayer Multiple**, **200-Week MA Ratio**, and **Pi Cycle
    Bottom**, computed locally from the existing Binance price feed (no extra
    API budget).
  - _Supply-age:_ **RHODL Ratio**, a distinct dimension from the MVRV/NUPL family.
- **Daily automatic refresh** (`.github/workflows/refresh-indicators.yml`): two
  scheduled passes a day regenerate the snapshot and commit it to `main` (which
  triggers the Vercel deploy) only when the underlying data actually changed. A
  `push` trigger also refreshes on merge so new indicators appear without
  waiting for cron.

### Changed
- `fetch:indicators` now records a `fetchedAt` per row and fetches stalest
  metrics first, skipping anything refreshed within `MIN_REFRESH_HOURS` (20h),
  so two runs cover the whole registry within bitcoin-data.com's ~8/hour and
  ~15/day free-tier caps. Added `--force` to bypass the freshness skip.
- Bottom-indicator page copy reflects the expanded on-chain + miner + price
  basket and the daily refresh cadence.

## [0.2.0.0] - 2026-07-04

### Added
- **BTC Bottom Indicator** (`/bottom_indicator`): a new on-chain dashboard that scores
  Bitcoin against a basket of valuation signals (MVRV, MVRV Z-Score, NUPL, SOPR, Reserve
  Risk, STH/LTH MVRV, Realized Price, Balanced Price). Each signal is scored 0–100 by its
  percentile across full history, with a Phase badge, 30-day change, and an orange→blue
  gradient meter. Includes an aggregate signal headline and live BTC spot price.
- `npm run fetch:indicators` script that pulls on-chain metrics from the keyless
  bitcoin-data.com API and BTC price history from Binance, computes the scores locally,
  and writes a committed snapshot (`src/app/bottom_indicator/data/indicators.json`) so the
  page renders statically with no runtime API calls.
- Homepage Projects grid now links to the BTC Bottom Indicator.

## [0.1.0.0] - 2026-07-03

### Added
- Scroll-driven motion across the home page: sections and cards rise in with a stepped, sprite-like reveal as you scroll, decorative gutter pixels drift at parallax speeds, and a chunky pixel "XP bar" fills along the top of the viewport to show reading progress.
- Dithered section transitions — the tinted Projects and Guestbook bands now fade in and out through 2x2 ordered-dither checkerboards instead of hard borders.
- Pixel grass strip along the hero's bottom edge.
- Social links (GitHub, X, LinkedIn) next to the "by Stefan Wang" byline in the hero, sized and aligned to the pixel aesthetic via a shared SocialLinks component.

### Changed
- "Say hi" section now points to X as the best place to reach me; the X/Twitter button carries the primary style.
- Footer LinkedIn mark redrawn as a chunky pixel badge matching the NES icon set; footer simplified to just the social row.
- All scroll-driven effects respect `prefers-reduced-motion` and are disabled in print rendering.

### Removed
- "made with pixels & <3" footer tagline.
