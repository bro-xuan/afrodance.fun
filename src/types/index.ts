/** Registered animated pixel-art scenes a project card can render instead of its emoji tile. */
export type ProjectVisual = "btc-cycle";

export interface Project {
  title: string;
  description: string;
  url: string;
  emoji: string;
  color?: "primary" | "success" | "warning" | "error";
  stack?: string[];
  visual?: ProjectVisual;
}

export interface SkillCategory {
  title: string;
  items: string[];
}

export interface LikeItem {
  emoji: string;
  label: string;
}

export interface AboutConfig {
  greeting: string;
  bio: string;
  avatarUrl: string;
  avatarFallback: string;
  tags: { label: string; color: string }[];
  skills: SkillCategory[];
  likes: LikeItem[];
}

export interface Article {
  title: string;
  description: string;
  url: string;
  date: string;
  emoji: string;
  caption?: string;
  lang?: "en" | "zh";
}

export interface Stack {
  label: string;
}

export interface NowItem {
  emoji: string;
  text: string;
}

export interface GuestbookMessage {
  id: number;
  name: string;
  message: string;
  date: string;
}
