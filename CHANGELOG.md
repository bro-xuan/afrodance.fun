# Changelog

All notable changes to afrodance.fun are documented here.
Format: `## [MAJOR.MINOR.PATCH.MICRO] - YYYY-MM-DD`

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
