import { Project, AboutConfig, Article, NowItem, GuestbookMessage } from "@/types";

export const siteConfig = {
  name: "afrodance.fun",
  tagline: "building fun things on the internet",
  emoji: "🕹️",
  socials: {
    github: "https://github.com/wangstefan",
    twitter: "https://x.com/Erc721_stefan",
  },
};

export const aboutConfig: AboutConfig = {
  greeting: "Hey, I'm Stefan!",
  bio: "Creative coder who loves building fun, weird, and beautiful things on the internet. Pixel art enthusiast. Always shipping.",
  avatarUrl: "/avatar.png",
  avatarFallback: "SW",
  tags: [
    { label: "creative coder", color: "bg-[#e8f5d4] text-[#3a6510]" },
    { label: "pixel art fan", color: "bg-[#d6eaf8] text-[#15608f]" },
    { label: "web builder", color: "bg-[#fef3cd] text-[#856404]" },
    { label: "open source", color: "bg-[#fadbd8] text-[#a93226]" },
  ],
  skills: [
    {
      title: "Frontend",
      items: ["React", "Next.js", "TypeScript", "Tailwind CSS", "HTML/CSS"],
    },
    {
      title: "Creative",
      items: ["Pixel Art", "Generative Art", "p5.js", "Animation", "UI Design"],
    },
    {
      title: "Tools",
      items: ["Git", "VS Code", "Figma", "Vercel", "Node.js"],
    },
  ],
  likes: [
    { emoji: "🎮", label: "Retro games" },
    { emoji: "🎨", label: "Pixel art" },
    { emoji: "🎵", label: "Lo-fi beats" },
    { emoji: "☕", label: "Coffee" },
    { emoji: "🌙", label: "Late nights" },
    { emoji: "🚀", label: "Shipping fast" },
  ],
};

export const articles: Article[] = [
  {
    title: "Building a Retro Portfolio with Next.js",
    description: "How I combined NES.css with modern React to create a pixel-art portfolio that actually feels fun to browse.",
    url: "https://example.com/retro-portfolio",
    date: "2026-02-15",
    emoji: "🎮",
  },
  {
    title: "Creative Coding with p5.js",
    description: "A beginner-friendly guide to generative art — from random circles to mesmerizing patterns.",
    url: "https://example.com/creative-coding",
    date: "2026-01-20",
    emoji: "🎨",
  },
  {
    title: "Why I Ship Side Projects Fast",
    description: "My philosophy on building small, fun things quickly instead of polishing forever.",
    url: "https://example.com/ship-fast",
    date: "2025-12-10",
    emoji: "🚀",
  },
  {
    title: "The Joy of Pixel Art",
    description: "Why constraints breed creativity, and how pixel art changed the way I think about design.",
    url: "https://example.com/pixel-art-joy",
    date: "2025-11-05",
    emoji: "✨",
  },
];

export const nowItems: NowItem[] = [
  { emoji: "🔨", text: "Building fun side projects with Next.js and pixel art aesthetics" },
  { emoji: "📚", text: "Learning Rust and systems programming fundamentals" },
  { emoji: "🧪", text: "Experimenting with generative art using p5.js and WebGL" },
  { emoji: "✍️", text: "Writing about creative coding and web development" },
  { emoji: "🎮", text: "Playing through retro game classics on my handheld" },
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
    title: "afrodance.fun",
    description: "This very site! A pixel-art portfolio for my fun projects.",
    url: "https://afrodance.fun",
    emoji: "🎮",
    color: "primary",
  },
  {
    title: "Predictooor",
    description: "Real-time Polymarket whale tracker with smart alerts, leaderboards, and wallet analytics.",
    url: "https://www.predictooor.xyz",
    emoji: "🐋",
    color: "success",
  },
  {
    title: "Earl",
    description: "AI-powered bespoke portraiture — turn any photo into a classical, museum-quality artwork.",
    url: "https://www.earl.homes",
    emoji: "🖼️",
    color: "warning",
  },
  {
    title: "Date Scoring",
    description: "A satirical app to rate your date on a 1–100 scale with red flags and green flags. Made for laughs.",
    url: "/date-scoring",
    emoji: "💘",
    color: "primary",
  },
  {
    title: "InstaClaw",
    description: "Deploy OpenClaw AI assistants to European servers in under 60 seconds — no DevOps required.",
    url: "https://www.instaclaw.cloud",
    emoji: "🤖",
    color: "error",
  },
];
