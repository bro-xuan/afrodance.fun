# afrodance.fun

A pixel-art portfolio site for showcasing fun side projects. Built with Next.js, NES.css, and Tailwind CSS.

## Projects

| Project | Description |
|---------|-------------|
| **Analog Camera Museum** | Pixel-art portfolio for fun projects |
| **Predictooor** | Real-time Polymarket whale tracker with smart alerts and wallet analytics |
| **Earl** | AI-powered bespoke portraiture — turn any photo into a classical artwork |
| **ADHD Saver** | Webcam-based focus monitor that plays escalating alerts when you look away |
| **Date Scoring** | Satirical app to rate your date on a 1-100 scale |
| **InstaClaw** | Deploy OpenClaw AI assistants to European servers in under 60 seconds |

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
│   ├── Footer.tsx          # Site footer
│   └── ui/                 # shadcn/ui + 8-bit component variants
├── data/
│   └── projects.ts         # All site content (projects, articles, config)
├── hooks/
│   └── useKonamiCode.ts    # Konami code detection hook
├── lib/
│   └── utils.ts            # Utility functions
└── types/
    └── index.ts            # TypeScript type definitions
public/
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

## Easter Egg

Try the Konami code on the homepage: `up up down down left right left right B A`
