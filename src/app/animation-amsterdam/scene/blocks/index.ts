// Puts the plan and the drawings together.

import { V2 } from "../../engine/math";
import { BlockDef, IsletDef, PITCH } from "../city";
import { BlockBuilder } from "../types";
import * as amstelM from "./amstel";
import * as arenaM from "./arena";
import * as centraalM from "./centraal";
import * as damM from "./dam";
import * as jordaanM from "./jordaan";
import * as marketM from "./market";
import * as nemoM from "./nemo";
import * as noordM from "./noord";
import { ISLET_PLAN, PLAN, TOUR } from "./plan";
import * as polderM from "./polder";
import * as rijksM from "./rijks";
import * as schipholM from "./schiphol";
import * as vondelM from "./vondel";
import * as windmillM from "./windmill";

type Module = Record<string, unknown>;

const modules: Record<string, Module> = {
  amstel: amstelM,
  arena: arenaM,
  centraal: centraalM,
  dam: damM,
  jordaan: jordaanM,
  market: marketM,
  nemo: nemoM,
  noord: noordM,
  polder: polderM,
  rijks: rijksM,
  schiphol: schipholM,
  vondel: vondelM,
  windmill: windmillM,
};

/** A block file exports its builder under its id, and optionally `<id>Land` when it is not a plain square of land. */
export const BLOCKS: BlockDef[] = PLAN.map((p) => ({
  ...p,
  build: modules[p.id][p.id] as BlockBuilder,
  land: modules[p.id][p.id + "Land"] as V2[][] | undefined,
}));

export const ISLETS: IsletDef[] = ISLET_PLAN.map((p) => ({ ...p, build: modules[p.id][p.id] as BlockBuilder }));

// The Dam exports the spot of one small story for the camera to end on.
const spot = (damM as Module).damSpot as [number, number, number] | undefined;
const damPlan = PLAN.find((p) => p.id === "dam");
export const CLOSEUP = spot && damPlan ? { x: damPlan.i * PITCH + spot[0], y: damPlan.j * PITCH + spot[1], zoom: spot[2] } : null;

export { TOUR };
