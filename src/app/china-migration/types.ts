export type Direction = "outbound" | "inbound" | "both";

export interface CountryDef {
  code: number;
  name: string;
  lat: number;
  lng: number;
}

export interface MigrationData {
  source: string;
  years: number[];
  countries: Record<string, CountryDef>;
  emigration: Record<string, Record<string, number>>;
  immigration: Record<string, Record<string, number>>;
}

export interface Particle {
  pairKey: string;
  partnerCode: number;
  direction: "outbound" | "inbound";
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  ctrlX: number;
  ctrlY: number;
  t: number;
  speed: number;
  trail: { x: number; y: number; t: number }[];
}

export const CHINA_LAT = 35.86;
export const CHINA_LNG = 104.20;
