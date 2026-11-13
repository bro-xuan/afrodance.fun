import { Project, FeaturedProject, AboutConfig, Agency, Article, NowItem, GuestbookMessage } from "@/types";

export const siteConfig = {
  name: "afrodance.fun",
  tagline: "building fun things on the internet — mostly AI and crypto",
  emoji: "🕹️",
  socials: {
    github: "https://github.com/bro-xuan",
    twitter: "https://x.com/Erc721_stefan",
    linkedin: "https://www.linkedin.com/in/stefan-wang-6516bb187/",
    substack: "https://substack.com/@stefanwangeth",
  },
  status: {
    text: "Open to AM / Sales roles in AI or blockchain",
    cta: "say hi",
  },
};

export const aboutConfig: AboutConfig = {
  greeting: "Hi, I'm Stefan.",
  bio: "I run a creative content agency helping local businesses up their social media game, no marketing hire needed. We plan their posts every week from their own photos, and the owner just says yes on their phone. On the side I still build things that some people surprisingly use, mostly around AI and crypto, and run What People Made, a daily gallery of real AI use cases. Run a business, or know one that could use better posts? Let's talk.",
  avatarUrl: "",
  avatarFallback: "SW",
  tags: [
    { label: "AI", color: "bg-[#e8f5d4] text-[#3a6510]" },
    { label: "Marketing", color: "bg-[#efe1f5] text-[#6c2f8a]" },
    { label: "Crypto", color: "bg-[#d6eaf8] text-[#15608f]" },
    { label: "SaaS", color: "bg-[#fef3cd] text-[#856404]" },
    { label: "EN / 中文 / DE", color: "bg-[#fadbd8] text-[#a93226]" },
  ],
  skills: [
    {
      title: "Frontend",
      items: ["React", "Next.js", "TypeScript", "Tailwind"],
    },
    {
      title: "AI",
      items: ["OpenAI API", "Anthropic API", "prompt engineering", "diffusion models"],
    },
    {
      title: "On-chain",
      items: ["Polymarket API", "Ethereum basics", "web3.js", "on-chain analytics"],
    },
  ],
  likes: [],
};

// The agency, right under the intro. Its copy says only what the studio does today, with no
// client names, results or prices. Its site is Paper Kite's own, served from public/paperkite.
export const agency: Agency = {
  name: "Paper Kite",
  url: "/paperkite",
  intro: "The marketing person your business never hired.",
  headline: "Up your social media game. On autopilot.",
  facts: ["Planned every week", "You approve every post", "Instagram · TikTok · Facebook"],
  description:
    "We get to know your business, then plan and write your posts every week from your own photos, in your voice. You say yes on your phone, each post goes out at the time you agreed, and what worked shapes next week.",
  promises: [
    "Your own photos, never stock pretending to be you",
    "No fake reviews, and AI-made images say so",
    "Your accounts stay yours: we never ask for a password",
    "Prices, offers and opening hours only after you confirm them",
  ],
};

export const articles: Article[] = [
  {
    title: "The End of Human Labor",
    description: "",
    url: "https://stefanwang.substack.com/p/the-end-of-human-labor",
    date: "2026-06-09",
    emoji: "🤖",
    caption:
      "Notes from an AI fireside chat with Google — why coding gets automated first, and what enterprises are quietly planning for knowledge work.",
    lang: "en",
  },
  {
    title: "AI时代的MBB",
    description: "MBB in the age of AI — an insider's confession",
    url: "https://stefanwang.substack.com/p/aimbb",
    date: "2026-06-09",
    emoji: "💼",
    caption:
      "Three years inside an MBB consultancy in Amsterdam — what AI does to a business built on selling people.",
    lang: "zh",
  },
];

export const nowItems: NowItem[] = [
  { emoji: "🔨", text: "Shipping side projects in AI and crypto" },
  { emoji: "🐋", text: "Watching whales move on Polymarket — turned it into Predictooor" },
  { emoji: "🤖", text: "Tinkering with Claude and OpenAI APIs for fun" },
  { emoji: "🍻", text: "Down to chat if you're building in AI or crypto" },
  { emoji: "🇳🇱", text: "Living in the Netherlands, ordering coffee in broken Dutch" },
];

export const seedGuestbookMessages: GuestbookMessage[] = [
  {
    id: 6,
    name: "indiehacker_jo",
    message: "How do you ship this many side projects?? Teach me your ways 😅",
    date: "2026-05-12",
  },
  {
    id: 5,
    name: "amsterdammer",
    message: "Your NL house-buying calc saved me a whole spreadsheet. Dank je! 🇳🇱",
    date: "2026-04-18",
  },
  {
    id: 4,
    name: "whale_watcher",
    message: "Found you through Predictooor — the whale alerts are legit. Nice work 🐋",
    date: "2026-03-30",
  },
  {
    id: 1,
    name: "PixelFan42",
    message: "Love the retro vibes! This site is so cool 🎮",
    date: "2026-02-28",
  },
  {
    id: 2,
    name: "CodeWizard",
    message: "Great portfolio! The CRT effect is a nice touch.",
    date: "2026-02-20",
  },
  {
    id: 7,
    name: "ai_curious",
    message: "Came for the portfolio, stayed for the corporate translator 😂",
    date: "2026-02-15",
  },
  {
    id: 3,
    name: "RetroGamer",
    message: "Did you find the secret? ↑↑↓↓←→←→BA 👀",
    date: "2026-02-10",
  },
];

// Shown wide above the project grid, with its newsletter's sign-up.
export const featuredProject: FeaturedProject = {
  title: "What People Made",
  url: "https://www.whatpeoplemade.com",
  facts: ["1,300+ real AI use cases", "New picks every day"],
  description:
    "Things people actually made with AI, from first-hand posts on X. An AI editor reads the day's posts, a second model checks the pictures, and every pick lists the tools behind it.",
  newsletter: {
    title: "I run a weekly AI newsletter",
    pitch:
      "One email a week: the biggest AI stories and what they change, the best things people built, and the new tools worth trying.",
    subscribeUrl: "https://buttondown.com/afrodance",
    archiveUrl: "https://buttondown.com/afrodance/archive/",
  },
  stack: ["Python", "DeepSeek", "Claude Code", "Buttondown", "Cloudflare Workers"],
};

export const projects: Project[] = [
  {
    title: "CineGlow",
    description:
      "Relights the photos you already took — golden hour, film flash, neon rain — and you still look exactly like you. An iOS app, almost ready for the App Store.",
    emoji: "🎞️",
    color: "error",
    stack: ["Expo / React Native", "Firebase", "Gemini"],
    visual: "photo-relight",
  },
  {
    title: "Predictooor",
    description: "Real-time Polymarket whale tracker. Wallet leaderboards, large-position alerts, on-chain receipts.",
    url: "https://www.predictooor.xyz",
    emoji: "🐋",
    color: "success",
    stack: ["Next.js", "Polymarket API", "Ethereum"],
    visual: "whale-tracker",
  },
  {
    title: "ReferReady",
    description: "Reference-call prep for job candidates. Sample questions, scripts, and frameworks — the underrated leverage point in hiring.",
    url: "https://referready.com",
    emoji: "📋",
    color: "primary",
    stack: ["Next.js", "Stripe"],
    visual: "reference-call",
  },
  {
    title: "Analog Camera Museum",
    description: "Pixel-art portfolio showcasing every project on this list.",
    url: "https://analogcams.com",
    emoji: "📷",
    color: "primary",
    visual: "analog-camera",
  },
  {
    title: "3D of Everything",
    description: "Real machines to turn over, look inside and take apart in 3D, from a pocket watch to the 2026 Roadster. Built by a skill for coding agents, installed in one line.",
    url: "/3d-of-everything",
    emoji: "⚙️",
    color: "warning",
    stack: ["three.js", "Agent skill"],
    visual: "machine-teardown",
  },
  {
    title: "Corporate Translator",
    description: "Decodes corporate jargon into plain English. Live BS score included.",
    url: "/corperate_translator",
    emoji: "💼",
    color: "success",
    visual: "jargon-decoder",
  },
  {
    title: "Earl",
    description: "AI-generated classical portraits from a single selfie. Diffusion models, museum-grade output.",
    url: "https://www.earl.homes",
    emoji: "🖼️",
    color: "warning",
    stack: ["Next.js", "Diffusion", "OpenAI API"],
    visual: "portrait-frame",
  },
  {
    title: "InstaClaw",
    description: "Deploy AI assistants on EU infrastructure in 60 seconds. GDPR-friendly alternative to US-hosted LLM apps.",
    url: "https://www.instaclaw.cloud",
    emoji: "🤖",
    color: "error",
    stack: ["Next.js", "EU infra", "LLM APIs"],
    visual: "instaclaw-deploy",
  },
  {
    title: "NL House Buying Tool",
    description: "End-to-end calculator for buying property in the Netherlands. Mortgage, tax, rent-vs-buy, regulation.",
    url: "/NLHousebuying",
    emoji: "🏠",
    color: "primary",
    visual: "house-build",
  },
  {
    title: "China Migration",
    description: "Three decades of inbound and outbound China migration, visualized as particle flows. UN DESA data, 1990–2020.",
    url: "/china-migration",
    emoji: "🌏",
    color: "warning",
    visual: "migration-flow",
  },
  {
    title: "Market Intel",
    description: "BTC trading desk on one page: positioning, liquidations, options, flows and macro scored into an intraday, swing and macro bias. Check a trade before you take it.",
    url: "/marketintel",
    emoji: "📊",
    color: "success",
    stack: ["Next.js", "Binance / Deribit / OKX APIs", "Upstash"],
    visual: "market-intel",
  },
  {
    title: "BTC Bottom & Top Indicator",
    description: "On-chain cycle dashboard — MVRV, NUPL, Pi Cycle & friends scored 0–100 to gauge how close Bitcoin is to a cycle bottom or top.",
    url: "/bottom_indicator",
    emoji: "📉",
    color: "error",
    stack: ["Next.js", "bitcoin-data.com", "On-chain"],
    visual: "btc-cycle",
  },
  // Hidden until the /date-scoring route exists — linking to it today 404s.
  // {
  //   title: "Date Scoring",
  //   description: "Satirical 1–100 date rating tool with red and green flag breakdowns.",
  //   url: "/date-scoring",
  //   emoji: "💘",
  //   color: "primary",
  // },
];
