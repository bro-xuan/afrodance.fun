import { Project, AboutConfig, Article, NowItem, GuestbookMessage } from "@/types";

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
  bio: "I build silly things that some people surprisingly use — mostly around AI, crypto, and trading. This page is part scrapbook of stuff I've shipped, part soapbox for my rants on whatever topic won't leave me alone lately. Poke around, and if you're building something fun, let's talk.",
  avatarUrl: "",
  avatarFallback: "SW",
  tags: [
    { label: "AI", color: "bg-[#e8f5d4] text-[#3a6510]" },
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

export const projects: Project[] = [
  {
    title: "Predictooor",
    description: "Real-time Polymarket whale tracker. Wallet leaderboards, large-position alerts, on-chain receipts.",
    url: "https://www.predictooor.xyz",
    emoji: "🐋",
    color: "success",
    stack: ["Next.js", "Polymarket API", "Ethereum"],
  },
  {
    title: "ReferReady",
    description: "Reference-call prep for job candidates. Sample questions, scripts, and frameworks — the underrated leverage point in hiring.",
    url: "https://referready.com",
    emoji: "📋",
    color: "primary",
    stack: ["Next.js", "Stripe"],
  },
  {
    title: "Analog Camera Museum",
    description: "Pixel-art portfolio showcasing every project on this list.",
    url: "https://analogcams.com",
    emoji: "📷",
    color: "primary",
  },
  {
    title: "Corporate Translator",
    description: "Decodes corporate jargon into plain English. Live BS score included.",
    url: "/corperate_translator",
    emoji: "💼",
    color: "success",
  },
  {
    title: "Earl",
    description: "AI-generated classical portraits from a single selfie. Diffusion models, museum-grade output.",
    url: "https://www.earl.homes",
    emoji: "🖼️",
    color: "warning",
    stack: ["Next.js", "Diffusion", "OpenAI API"],
  },
  {
    title: "InstaClaw",
    description: "Deploy AI assistants on EU infrastructure in 60 seconds. GDPR-friendly alternative to US-hosted LLM apps.",
    url: "https://www.instaclaw.cloud",
    emoji: "🤖",
    color: "error",
    stack: ["Next.js", "EU infra", "LLM APIs"],
  },
  {
    title: "NL House Buying Tool",
    description: "End-to-end calculator for buying property in the Netherlands. Mortgage, tax, rent-vs-buy, regulation.",
    url: "/NLHousebuying",
    emoji: "🏠",
    color: "primary",
  },
  {
    title: "China Migration",
    description: "Three decades of inbound and outbound China migration, visualized as particle flows. UN DESA data, 1990–2020.",
    url: "/china-migration",
    emoji: "🌏",
    color: "warning",
  },
  {
    title: "ADHD Saver",
    description: "Computer-vision focus tracker. Detects zone-outs in real time and nudges you back. 15 alert tones.",
    url: "/adhd_saver",
    emoji: "🧠",
    color: "warning",
  },
  // Hidden until the /date-scoring route exists — linking to it today 404s.
  // {
  //   title: "Date Scoring",
  //   description: "Satirical 1–100 date rating tool with red and green flag breakdowns.",
  //   url: "/date-scoring",
  //   emoji: "💘",
  //   color: "primary",
  // },
  {
    title: "Greenroom",
    description: "Voice-native mock finance interviews. AI interviewer grounded in cited company data, with every bluff flagged and sourced after the call. Built for Megathon 2026.",
    url: "https://greenroom-inky.vercel.app/",
    emoji: "🎙️",
    color: "success",
    stack: ["Next.js", "Vapi", "Cala.ai", "Anthropic API"],
  },
];
