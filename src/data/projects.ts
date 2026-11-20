import type { App, ArtPiece, Essay, FeaturedApp, IndexEntry, Newsletter } from "@/types";

// The home page leads with three kinds of project, in this order: the apps, the newsletter and
// the art. Everything else is one row in the "Also made" index at the bottom.

export const siteConfig = {
  name: "afrodance.fun",
  owner: "Stefan Wang",
  socials: {
    github: "https://github.com/bro-xuan",
    twitter: "https://x.com/Erc721_stefan",
    linkedin: "https://www.linkedin.com/in/stefan-wang-6516bb187/",
    substack: "https://substack.com/@stefanwangeth",
  },
  /** Who's behind the site, beside the portrait. */
  bio: "I build products on the internet, mostly with AI and crypto, from the Netherlands.",
  /** The tags under the bio. */
  tags: ["AI", "Crypto", "SaaS", "EN / 中文 / DE"],
};

// ── 2. The newsletter ─────────────────────────────────────────────────────────────────────────
// The sign-up is on whatpeoplemade.com itself, so "Subscribe" goes there (see 0.5.12.0).
export const newsletter: Newsletter = {
  title: "What People Made",
  url: "https://www.whatpeoplemade.com",
  tagline: "The awesomest things people made with AI",
  description:
    "Every pick comes from a first-hand post on X. An AI editor reads the day's posts, a second model checks the pictures, and every pick lists the tools behind it.",
  pitch:
    "Once a week the best of it goes out as one email: the biggest AI stories and what they change, the best things people built, and the new tools worth trying.",
  archiveUrl: "https://buttondown.com/afrodance/archive/",
};

export const essays: Essay[] = [
  {
    title: "The End of Human Labor",
    url: "https://stefanwang.substack.com/p/the-end-of-human-labor",
    date: "2026-06-09",
    lang: "en",
  },
  {
    title: "AI时代的MBB",
    url: "https://stefanwang.substack.com/p/aimbb",
    date: "2026-06-09",
    lang: "zh",
  },
];

// ── 3. The art ────────────────────────────────────────────────────────────────────────────────
// The three cities hang together as a series; the museum hangs on its own below them.
// Amsterdam and London's pictures are their share images; Berlin's is the same kind of still
// (the finished city, 1200×630), made for this page only: Berlin has no share image.
export const drawnInCode: ArtPiece[] = [
  {
    title: "Amsterdam",
    url: "/animation-amsterdam",
    image: {
      src: "/home/amsterdam.jpg",
      alt: "An isometric drawing of Amsterdam seen from above: nine neighbourhoods separated by canals, with Centraal Station, the Rijksmuseum, a windmill, boats and bridges, and four small islands off the corners.",
      width: 960,
      height: 504,
    },
    caption: "Canals, trams and boats, and a wedding on the palace balcony.",
    details: "115 kB of code, no images · 80 s loop",
  },
  {
    title: "London",
    url: "/animation-london",
    image: {
      src: "/home/london.jpg",
      alt: "An isometric drawing of London seen from above: the Thames winding between nine neighbourhoods, with the Houses of Parliament, St Paul's, the Tower and Tower Bridge, the London Eye and the Shard, red buses on the streets, and four small islands off the corners.",
      width: 960,
      height: 504,
    },
    caption: "The Thames, Tower Bridge lifting for a barge, and ducks crossing outside the palace.",
    details: "165 kB of code, no images · 80 s loop",
  },
  {
    title: "Berlin",
    url: "/animation-berlin",
    image: {
      src: "/home/berlin.jpg",
      alt: "An isometric drawing of Berlin seen from above: the Spree winding past nine neighbourhoods, with the Brandenburger Tor, the Reichstag, the TV tower, the Berliner Dom on Museum Island and the Oberbaumbrücke, and islands for Wannsee, Tempelhofer Feld and Treptower Park.",
      width: 960,
      height: 504,
    },
    caption: "The Spree, the U1 over the Oberbaumbrücke, and a soap bubble under the Gate.",
    details: "122 kB of code, no images · 78 s loop",
  },
];

export const museum: ArtPiece = {
  title: "World Analog Photography Museum",
  url: "https://analogcams.com",
  image: {
    src: "/home/museum.jpg",
    alt: "The World Analog Photography Museum: its title over a wall of camera photos, from the Nikon F3 and the Hasselblad 500C to the Leica M6.",
    width: 1200,
    height: 630,
  },
  caption:
    "A living museum of every analog camera and film ever made: one endless wall of cameras you can drag around, or a grid you can filter by brand.",
  details: "7,800+ cameras · 165 brands · analogcams.com",
};

// ── 1. The apps ───────────────────────────────────────────────────────────────────────────────
// Mora leads. Its App Store page isn't live yet (1.0 went to review on 2026-11-18): when it is,
// point `url` at it and drop `status`.
export const mora: FeaturedApp = {
  name: "Mora",
  url: "https://mora-app.fly.dev",
  icon: {
    src: "/home/mora-icon.png",
    alt: "Mora's app icon: a lowercase m made of a purple arch and a peach arch.",
    width: 256,
    height: 256,
  },
  tagline: "Everything for the two of you.",
  description:
    "One place for your relationship: how long you've been together, the days you want to remember, the distance between you, games to play together, and a question a day to keep you talking. You each use it on your own phone, side by side or miles apart.",
  features: [
    "A question a day, sealed until you've both answered",
    "Day 1, Day 100, Day 1,000, with milestones and countdowns",
    "13 games to play together, one phone each",
    "A pet that walks on both your phones",
  ],
  audience: "For couples",
  status: "Coming soon to the App Store",
  facts: ["iPhone", "Free, and Mora Plus covers you both", "For couples 18+"],
};

export const apps: App[] = [
  {
    name: "Predictooor",
    url: "https://www.predictooor.xyz",
    audience: "For Polymarket traders",
    tagline: "Track smart money before the market moves.",
    description:
      "Follow Polymarket wallets live, get a Telegram alert when a whale trades, and watch the biggest bets come in.",
    visual: "whale-tracker",
  },
  {
    name: "ReferReady",
    url: "https://referready.com",
    audience: "For job seekers",
    tagline: "Job referrals from people at your dream company.",
    description:
      "Find an employee who will refer you for the role you want. They keep the whole referral bonus.",
    visual: "reference-call",
  },
];

// ── Also made ─────────────────────────────────────────────────────────────────────────────────
export const alsoMade: IndexEntry[] = [
  {
    title: "CineGlow",
    line: "Relights the photos you took, and you still look like you",
    kind: "iOS app, soon",
    emoji: "🎞️",
    visual: "photo-relight",
  },
  {
    title: "3D of Everything",
    url: "/3d-of-everything",
    line: "Real machines to turn over and take apart in 3D",
    kind: "3D",
    emoji: "⚙️",
    visual: "machine-teardown",
  },
  {
    title: "Market Intel",
    url: "/marketintel",
    line: "A BTC trading desk on one page",
    kind: "trading",
    emoji: "📊",
    visual: "market-intel",
  },
  {
    title: "BTC Bottom & Top Indicator",
    url: "/bottom_indicator",
    line: "How close Bitcoin is to a cycle bottom or top",
    kind: "on-chain",
    emoji: "📉",
    visual: "btc-cycle",
  },
  {
    title: "Paper Kite",
    url: "https://paperkite.eu",
    line: "An agentic social media agency for local businesses",
    kind: "agency",
    emoji: "🪁",
  },
  {
    title: "China Migration",
    url: "/china-migration",
    line: "Thirty years of migration in and out of China, as particle flows",
    kind: "data viz",
    emoji: "🌏",
    visual: "migration-flow",
  },
  {
    title: "NL House Buying Tool",
    url: "/NLHousebuying",
    line: "Mortgage, tax and rent-vs-buy for a home in the Netherlands",
    kind: "calculator",
    emoji: "🏠",
    visual: "house-build",
  },
  {
    title: "Corporate Translator",
    url: "/corperate_translator",
    line: "Corporate jargon into plain English, with a live BS score",
    kind: "web toy",
    emoji: "💼",
    visual: "jargon-decoder",
  },
  {
    title: "Earl",
    url: "https://www.earl.homes",
    line: "Classical portraits from a single selfie",
    kind: "AI art",
    emoji: "🖼️",
    visual: "portrait-frame",
  },
  {
    title: "InstaClaw",
    url: "https://www.instaclaw.cloud",
    line: "AI assistants on EU servers in 60 seconds",
    kind: "AI hosting",
    emoji: "🤖",
    visual: "instaclaw-deploy",
  },
];
