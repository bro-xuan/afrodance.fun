import { Project, AboutConfig, Article, NowItem, GuestbookMessage } from "@/types";

export const siteConfig = {
  name: "afrodance.fun",
  tagline: "building fun things on the internet — mostly AI and crypto",
  emoji: "🕹️",
  socials: {
    github: "https://github.com/bro-xuan",
    twitter: "https://x.com/Erc721_stefan",
    linkedin: "https://www.linkedin.com/in/stefan-wang-6516bb187/",
  },
  status: {
    text: "Open to AM / Sales roles in AI or blockchain",
    cta: "say hi",
  },
};

export const aboutConfig: AboutConfig = {
  greeting: "Hi, I'm Stefan.",
  bio: "I build little things at the intersection of AI, crypto, and curiosity — a Polymarket whale tracker, an AI portraiture app, a Dutch house-buying calculator I built because I was buying one, a satirical app to rate your date. Looking to move closer to product and customers in AI or blockchain — drop me a line if that sounds interesting.",
  avatarUrl: "",
  avatarFallback: "SW",
  tags: [
    { label: "builder", color: "bg-[#e8f5d4] text-[#3a6510]" },
    { label: "AI & crypto", color: "bg-[#d6eaf8] text-[#15608f]" },
    { label: "shipping fast", color: "bg-[#fef3cd] text-[#856404]" },
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
    title: "我停止了和外国人的无意义社交",
    description: "",
    url: "https://www.xiaohongshu.com/explore/672014e3000000002100b427?xsec_token=ABNmLl8W7kzldbrPaU4EQbavoIq4l9OanxEgqOfasCBIQ=",
    date: "2024-10-29",
    emoji: "🤝",
    caption: "On the cost of small talk abroad.",
  },
  {
    title: "尽早体验有钱人的生活",
    description: "",
    url: "https://www.xiaohongshu.com/explore/6722bb85000000001b0130db?xsec_token=ABLJFbVkZKyJm838Ka1D-aYMooqUrvaranOa7V6cwp_5M=",
    date: "2024-10-31",
    emoji: "💰",
    caption: "On taste, exposure, and ambition.",
  },
  {
    title: "30岁以前，试错的人生才是开挂的人生",
    description: "",
    url: "https://www.xiaohongshu.com/explore/6720f32e000000001901ae2c?xsec_token=ABNmLl8W7kzldbrPaU4EQbalzbEQVsb0O3h_rQqFXFzsc=",
    date: "2024-10-29",
    emoji: "🚀",
    caption: "On why optionality compounds in your twenties.",
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
    id: 3,
    name: "RetroGamer",
    message: "Did you find the secret? ↑↑↓↓←→←→BA 👀",
    date: "2026-02-10",
  },
];

export const projects: Project[] = [
  {
    title: "Predictooor",
    description: "Got nerd-sniped by Polymarket whales. Built a real-time tracker — wallet leaderboards, alerts when 6-figure positions move, on-chain receipts.",
    url: "https://www.predictooor.xyz",
    emoji: "🐋",
    color: "success",
    stack: ["Next.js", "Polymarket API", "Ethereum"],
  },
  {
    title: "Earl",
    description: "Bespoke AI portraiture. Upload a selfie, get a museum-quality classical portrait. Built with diffusion models and obsessive prompt tuning.",
    url: "https://www.earl.homes",
    emoji: "🖼️",
    color: "warning",
    stack: ["Next.js", "Diffusion", "OpenAI API"],
  },
  {
    title: "InstaClaw",
    description: "Spin up AI assistants on European servers in under 60 seconds — no DevOps. Built for teams that want OpenAI-style apps without sending data to US-east.",
    url: "https://www.instaclaw.cloud",
    emoji: "🤖",
    color: "error",
    stack: ["Next.js", "EU infra", "LLM APIs"],
  },
  {
    title: "ReferReady",
    description: "Reference calls are the most underrated part of a job hunt. A tool to help candidates prep — sample questions, scripts, the works.",
    url: "https://referready.com",
    emoji: "📋",
    color: "primary",
    stack: ["Next.js", "Stripe"],
  },
  {
    title: "NL House Buying Tool",
    description: "Built this while buying a house in the Netherlands. Mortgage math, tax breaks, rent-vs-buy, regulation checks — the calculations my broker glossed over.",
    url: "/NLHousebuying",
    emoji: "🏠",
    color: "primary",
  },
  {
    title: "China Migration",
    description: "Three decades of migration in and out of China, animated as particle flows over a world map. UN DESA data, 1990–2020.",
    url: "/china-migration",
    emoji: "🌏",
    color: "warning",
  },
  {
    title: "ADHD Saver",
    description: "Built this for myself. Computer vision watches your face — if you zone out, it pings you back. 15 alert sounds. Surprisingly effective.",
    url: "/adhd_saver",
    emoji: "🧠",
    color: "warning",
  },
  {
    title: "Corporate Translator",
    description: "Translates corporate jargon into Gen Z. Live BS Score. No more synergies.",
    url: "/corperate_translator",
    emoji: "💼",
    color: "success",
  },
  {
    title: "Date Scoring",
    description: "Rate your date 1–100, with red flags and green flags. Strictly satirical. Made me laugh.",
    url: "/date-scoring",
    emoji: "💘",
    color: "primary",
  },
  {
    title: "Analog Camera Museum",
    description: "This site! Pixel-art portfolio for the rest of the stuff above.",
    url: "https://analogcams.com",
    emoji: "🎮",
    color: "primary",
  },
];
