/** Registered animated pixel-art scenes a project card can render instead of its emoji tile. */
export type ProjectVisual =
  | "btc-cycle"
  | "market-intel"
  | "whale-tracker"
  | "reference-call"
  | "analog-camera"
  | "jargon-decoder"
  | "portrait-frame"
  | "instaclaw-deploy"
  | "house-build"
  | "migration-flow"
  | "machine-teardown"
  | "photo-relight";

export interface Project {
  title: string;
  description: string;
  /** Where the card links. Leave it out for a project that isn't public yet: the card then has no link and says "Coming soon". */
  url?: string;
  emoji: string;
  color?: "primary" | "success" | "warning" | "error";
  stack?: string[];
  visual?: ProjectVisual;
}

/** The one project shown wide above the grid, with the newsletter that goes with it. */
export interface FeaturedProject {
  title: string;
  url: string;
  /** Short facts shown as chips above the description. */
  facts: string[];
  description: string;
  newsletter: {
    title: string;
    pitch: string;
    subscribeUrl: string;
    archiveUrl: string;
  };
  stack?: string[];
}

/** The agency, right under the intro: what it does, how a week with it goes, what it won't do, and how to get in touch. */
export interface Agency {
  name: string;
  /** The agency's own site. */
  url: string;
  /** One line under the section's heading. */
  intro: string;
  headline: string;
  /** Short facts shown as chips above the description. */
  facts: string[];
  description: string;
  steps: { title: string; body: string }[];
  /** What it won't do, each with a check. */
  promises: string[];
  contact: { label: string; url: string };
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
