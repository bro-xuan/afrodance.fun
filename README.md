# afrodance.fun

A pixel-art portfolio site for showcasing fun side projects, and the home page of my agency. Built with Next.js, NES.css, and Tailwind CSS.

## The agency

Right under the intro sits **Paper Kite** ([paperkite.studio](https://paperkite.studio)), my creative content agency for local businesses: we learn the
business, plan its posts every week from its own photos, and the owner approves them on their phone. The
section has its own pixel scene (a phone where the week's posts get approved and hop onto the calendar),
the four steps of a week, what the agency won't do, a button to its site and one to LinkedIn. The hero
links to it first.
Its copy lives in `agency` in `src/data/projects.ts` and says only what the studio does today: no client
names, results or prices.

## Projects

| Project | Description |
|---------|-------------|
| **What People Made** (featured) | Daily gallery of real AI use cases from posts on X, plus a weekly AI newsletter ([whatpeoplemade.com](https://www.whatpeoplemade.com)) |
| **CineGlow** | iOS app that relights photos you already took (golden hour, film flash and more); coming soon to the App Store |
| **Predictooor** | Real-time Polymarket whale tracker with smart alerts and wallet analytics |
| **ReferReady** | Reference-call prep for job candidates |
| **Analog Camera Museum** | Pixel-art portfolio for fun projects |
| **3D of Everything** | Real machines to turn over, look inside and take apart in 3D |
| **Corporate Translator** | Decodes corporate jargon into plain English, live BS score included |
| **Earl** | AI-powered bespoke portraiture — turn any photo into a classical artwork |
| **InstaClaw** | Deploy OpenClaw AI assistants to European servers in under 60 seconds |
| **NL House Buying Tool** | End-to-end calculator for buying property in the Netherlands |
| **China Migration** | Three decades of China migration visualized as particle flows |
| **Market Intel** | BTC trading desk on one page, scored into an intraday, swing and macro bias |
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
│   └── page.tsx            # Homepage
├── components/
│   ├── Hero.tsx            # Animated hero section
│   ├── Agency.tsx          # The agency (Paper Kite) under the intro: scene, pitch, steps, promises
│   ├── ProjectGrid.tsx     # Project cards grid
│   ├── FeaturedProject.tsx # Wide featured card above the grid, with the newsletter sign-up
│   ├── ProjectCard.tsx     # Individual project card
│   ├── visuals/            # One animated pixel-art scene per project card, and the agency's (*Visual.tsx)
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
│   ├── projects.ts         # All site content (the agency, projects, articles, config)
│   └── sprites.ts          # Pixel-art critter sprite data + palette
├── hooks/
│   └── useKonamiCode.ts    # Konami code detection hook
├── lib/
│   └── utils.ts            # Utility functions
└── types/
    └── index.ts            # TypeScript type definitions
public/
├── 3d-of-everything/       # 3D of Things, baked in by `npm run export` in bro-xuan/3d-of-things (don't edit by hand)
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
