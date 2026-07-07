# Changelog

All notable changes to afrodance.fun are documented here.
Format: `## [MAJOR.MINOR.PATCH.MICRO] - YYYY-MM-DD`

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
