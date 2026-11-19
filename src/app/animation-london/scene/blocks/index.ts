// Puts the plan and the drawings together.

import { BlockDef, IsletDef, LondonBuilder, blockOrigin } from "../city";
import * as banksideM from "./bankside";
import * as bloomsburyM from "./bloomsbury";
import * as camdenM from "./camden";
import * as greenwichM from "./greenwich";
import * as londonbridgeM from "./londonbridge";
import * as nottinghillM from "./nottinghill";
import * as palaceM from "./palace";
import { ISLET_PLAN, PLAN, TOUR } from "./plan";
import * as southbankM from "./southbank";
import * as stpaulsM from "./stpauls";
import * as towerM from "./tower";
import * as westendM from "./westend";
import * as westminsterM from "./westminster";
import * as wimbledonM from "./wimbledon";

type Module = Record<string, unknown>;

const modules: Record<string, Module> = {
  bankside: banksideM,
  bloomsbury: bloomsburyM,
  camden: camdenM,
  greenwich: greenwichM,
  londonbridge: londonbridgeM,
  nottinghill: nottinghillM,
  palace: palaceM,
  southbank: southbankM,
  stpauls: stpaulsM,
  tower: towerM,
  westend: westendM,
  westminster: westminsterM,
  wimbledon: wimbledonM,
};

/** A place's file exports its builder under its id. */
export const BLOCKS: BlockDef[] = PLAN.map((p) => ({ ...p, build: modules[p.id][p.id] as LondonBuilder }));

export const ISLETS: IsletDef[] = ISLET_PLAN.map((p) => ({ ...p, build: modules[p.id][p.id] as LondonBuilder }));

// The palace exports the spot of one small story for the camera to end on: local x, y and how far to push in.
const spot = (palaceM as Module).palaceSpot as [number, number, number] | undefined;
const last = PLAN.find((p) => p.id === "palace");
export const CLOSEUP = spot && last ? { x: blockOrigin(last.i, last.j)[0] + spot[0], y: blockOrigin(last.i, last.j)[1] + spot[1], zoom: spot[2] } : null;

export { TOUR };
