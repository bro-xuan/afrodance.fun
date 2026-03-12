import { Project, AboutConfig, Article, NowItem, GuestbookMessage } from "@/types";

export const siteConfig = {
  name: "afrodance.fun",
  tagline: "building fun things on the internet",
  emoji: "🕹️",
  socials: {
    github: "https://github.com/bro-xuan",
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
    title: "我停止了和外国人的无意义社交",
    description: "",
    url: "https://www.xiaohongshu.com/explore/672014e3000000002100b427?xsec_token=ABNmLl8W7kzldbrPaU4EQbavoIq4l9OanxEgqOfasCBIQ=",
    date: "2024-10-29",
    emoji: "🤝",
  },
  {
    title: "尽早体验有钱人的生活",
    description: "",
    url: "https://www.xiaohongshu.com/explore/6722bb85000000001b0130db?xsec_token=ABLJFbVkZKyJm838Ka1D-aYMooqUrvaranOa7V6cwp_5M=",
    date: "2024-10-31",
    emoji: "💰",
  },
  {
    title: "这辈子date过最有趣的一个女生",
    description: "",
    url: "https://www.xiaohongshu.com/explore/6725374c000000001b02aca7?xsec_token=ABHDmRwOqsRjghtFBmSQ3AEro3FdP4667k-kZwRTFBTs0=",
    date: "2024-11-01",
    emoji: "💫",
  },
  {
    title: "30岁以前，试错的人生才是开挂的人生",
    description: "",
    url: "https://www.xiaohongshu.com/explore/6720f32e000000001901ae2c?xsec_token=ABNmLl8W7kzldbrPaU4EQbalzbEQVsb0O3h_rQqFXFzsc=",
    date: "2024-10-29",
    emoji: "🚀",
  },
  {
    title: "细谈男生怎样拥有big d*ck energy",
    description: "",
    url: "https://www.xiaohongshu.com/explore/671d03bc0000000026035977?xsec_token=ABkltlQp1MLWqXNvjHXPc4pYHGqA29OX5mJyPHm4v1tXc=",
    date: "2024-10-26",
    emoji: "🔥",
  },
  {
    title: "Date中国和外国女生的区别",
    description: "",
    url: "https://www.xiaohongshu.com/explore/671e771000000000210065e2?xsec_token=ABTOcjF0gLFmIT94PV9oi9s0ndgxNWlYZc_lJvwiYBsOI=",
    date: "2024-10-27",
    emoji: "🌏",
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
