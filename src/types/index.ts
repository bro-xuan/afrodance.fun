/** Registered animated pixel-art scenes (src/components/visuals), each drawn at 96×40. */
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

/** Pillar 1: the daily AI use-case gallery and the weekly email that comes out of it. */
export interface Newsletter {
  title: string;
  /** The site, which has the sign-up. */
  url: string;
  /** The line the site opens with. */
  tagline: string;
  /** How the picks are made. */
  description: string;
  /** What's in the weekly email. */
  pitch: string;
  archiveUrl: string;
}

export interface Essay {
  title: string;
  url: string;
  /** ISO date, YYYY-MM-DD. */
  date: string;
  lang: "en" | "zh";
}

export interface Picture {
  src: string;
  alt: string;
  width: number;
  height: number;
}

/** Pillar 2: a work hung on the gallery wall, with its museum label. */
export interface ArtPiece {
  title: string;
  url: string;
  image: Picture;
  /** One line on the label. */
  caption: string;
  /** The small print on the label: medium, size, length. */
  details: string;
}

/** Pillar 3: the app the section leads with. */
export interface FeaturedApp {
  name: string;
  url: string;
  icon: Picture;
  /** Who it is for, on its tab in the carousel. */
  audience: string;
  tagline: string;
  description: string;
  /** What it does, one line each. */
  features: string[];
  /** Where it is on its way to people, e.g. waiting for the App Store. */
  status: string;
  /** Platform, price and age, one chip each. */
  facts: string[];
}

export interface App {
  name: string;
  url: string;
  /** Who it is for, on its tab in the carousel. */
  audience: string;
  tagline: string;
  description: string;
  visual: ProjectVisual;
}

/** A row in the "Also made" index: everything that isn't one of the three pillars. */
export interface IndexEntry {
  title: string;
  /** Leave it out for a project that isn't public yet: the row then has no link. */
  url?: string;
  /** What it is, in a few words. */
  line: string;
  /** The kind of thing, shown at the end of the row. */
  kind: string;
  emoji: string;
  /** Its animated scene, shown beside the list while the row is hovered. */
  visual?: ProjectVisual;
}
