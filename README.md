# afrodance.fun

A pixel-art portfolio site for showcasing fun side projects. Built with Next.js, NES.css, and Tailwind CSS.

## Projects

| Project | Description |
|---------|-------------|
| **Predictooor** | Real-time Polymarket whale tracker with smart alerts and wallet analytics |
| **ReferReady** | Reference-call prep for job candidates |
| **Analog Camera Museum** | Pixel-art portfolio for fun projects |
| **Corporate Translator** | Decodes corporate jargon into plain English, live BS score included |
| **Earl** | AI-powered bespoke portraiture — turn any photo into a classical artwork |
| **InstaClaw** | Deploy OpenClaw AI assistants to European servers in under 60 seconds |
| **NL House Buying Tool** | End-to-end calculator for buying property in the Netherlands |
| **China Migration** | Three decades of China migration visualized as particle flows |
| **BTC Bottom Indicator** | On-chain signal dashboard scoring how close Bitcoin is to a cycle bottom |

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS 4 + NES.css (8-bit aesthetic)
- **UI Components:** shadcn/ui (8-bit variants) + Radix UI
- **Fonts:** Press Start 2P (headings) + Pixelify Sans (body)

## Getting Started

```bash
git clone https://github.com/bro-xuan/afrodance.fun.git
cd afrodance.fun
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the site.

## Project Structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout with pixel fonts
│   ├── page.tsx            # Homepage
│   └── adhd_saver/         # ADHD Saver landing page
├── components/
│   ├── Hero.tsx            # Animated hero section
│   ├── ProjectGrid.tsx     # Project cards grid
│   ├── ProjectCard.tsx     # Individual project card
│   ├── ArticleGrid.tsx     # Substack posts grid
│   ├── AboutMe.tsx         # About section with bio & identity badges
│   ├── NowSection.tsx      # "What I'm doing now" section
│   ├── Guestbook.tsx       # Guestbook with messages
│   ├── KonamiEasterEgg.tsx # Konami code easter egg
│   ├── PixelDivider.tsx    # Decorative section divider
│   ├── DitherBand.tsx      # Full-bleed section tint with dithered edges
│   ├── DriftPixels.tsx     # Scroll-parallax decorative gutter pixels
│   ├── PixelSprite.tsx     # Renders an original pixel-art sprite as crisp SVG
│   ├── PixelCritters.tsx   # Animated critter mascots per section (scroll/hover)
│   ├── SocialLinks.tsx     # GitHub/X/LinkedIn pixel icon row
│   ├── Footer.tsx          # Site footer
│   └── ui/                 # shadcn/ui + 8-bit component variants
├── data/
│   ├── projects.ts         # All site content (projects, articles, config)
│   └── sprites.ts          # Pixel-art critter sprite data + palette
├── hooks/
│   └── useKonamiCode.ts    # Konami code detection hook
├── lib/
│   └── utils.ts            # Utility functions
└── types/
    └── index.ts            # TypeScript type definitions
public/
├── 3d-of-everything/       # 3D of Things, baked in by `npm run export` in bro-xuan/3d-of-things (don't edit by hand)
├── adhd_saver/             # ADHD Saver source code & sounds
└── date-scoring/           # Date Scoring app assets
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm test` | Run the vitest suite |
| `npm run fetch:indicators` | Refresh the BTC Bottom Indicator data snapshot |
| `npm run preview` | Build for Cloudflare and run it locally in the Workers runtime |
| `npm run deploy` | Build for Cloudflare and deploy the `afrodance-fun` Worker |

## Hosting

Cloudflare Workers, via the [OpenNext adapter](https://opennext.js.org/cloudflare), serving
afrodance.fun and www.afrodance.fun. Config is in `wrangler.jsonc` and `open-next.config.ts`.
Pushes to `main` deploy through Workers Builds; `npm run deploy` deploys from your machine.

- The Worker is placed next to AWS Frankfurt (`placement.region`), since exchange APIs refuse US IPs.
  Binance refuses Cloudflare's IPs anyway, so the `/api/marketintel` routes fall back to Bybit
  (`src/app/api/marketintel/_lib/bybit.ts`).
- Cloudflare doesn't cache a Worker's own responses. `_lib/edge-cache.ts` caches the market routes
  for their `s-maxage` and keeps the last healthy copy when an upstream briefly refuses.
- Redis (guestbook, pulse history) is optional and off. To turn it on, set the Worker secrets
  `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` with `npx wrangler secret put`.

## Easter Egg

Try the Konami code on the homepage: `up up down down left right left right B A`
