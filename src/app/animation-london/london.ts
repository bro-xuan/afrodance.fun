// The London film: the city plan handed to the film runner (film.ts). First
// the river flows in and the drawing sketches itself in block by block, then
// the camera tours each neighbourhood and islet and ends close in at the
// palace, then it pulls back, evening falls, the bridges light up and
// fireworks go off over the river, and the page fades to blank paper and
// starts again.

import { type Film, type FilmOptions, createFilm } from "./film";
import { BlockDef, City, DEPTH, IsletDef, buildCity } from "./scene/city";

export { planTimeline, planTour } from "./film";
export type { Caption, FilmOptions, Leg, Timeline } from "./film";

export type London = Film<City>;

/** What to draw: the neighbourhoods, the islets, and the order the camera visits them in. */
export interface Plan {
  blocks: BlockDef[];
  islets: IsletDef[];
  tour: string[];
  /** One small story to push right in on at the end of the tour (world position, zoom relative to a tour stop). */
  closeup?: { x: number; y: number; zoom: number } | null;
}

export function createLondon(canvas: HTMLCanvasElement, plan: Plan, opts: FilmOptions = {}): London {
  return createFilm(canvas, { build: () => buildCity(plan.blocks, plan.islets), tour: plan.tour, closeup: plan.closeup, depth: DEPTH }, opts);
}
