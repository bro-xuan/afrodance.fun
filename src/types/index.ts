export interface Project {
  title: string;
  description: string;
  url: string;
  emoji: string;
  color?: "primary" | "success" | "warning" | "error";
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
