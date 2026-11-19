// Puts the plan and the drawings together: each place on the plan gets the
// drawing registered for its id in DRAWN, one file per place.

import { BlockDef, IsletDef, blockOrigin } from "../city";
import { BlockBuilder } from "../types";
import { alexanderplatz } from "./alexanderplatz";
import { brandenburgertor, gateSpot } from "./brandenburgertor";
import { charlottenburg } from "./charlottenburg";
import { citywest } from "./citywest";
import { friedrichshain } from "./friedrichshain";
import { island } from "./island";
import { kreuzberg } from "./kreuzberg";
import { museumsinsel } from "./museumsinsel";
import { ISLET_PLAN, PLAN, TOUR } from "./plan";
import { prenzlauerberg } from "./prenzlauerberg";
import { reichstag } from "./reichstag";
import { park, sampleFor, square, terrace } from "./sample";
import { tempelhof } from "./tempelhof";
import { tiergarten } from "./tiergarten";
import { treptow } from "./treptow";
import { wannsee } from "./wannsee";

interface Drawn {
  build: BlockBuilder;
  /** Where the final close-up looks if the tour ends here: local x, y and zoom. */
  spot?: [number, number, number];
}

/** id on the plan → its drawing. */
export const DRAWN: Record<string, Drawn> = {
  brandenburgertor: { build: brandenburgertor, spot: gateSpot },
  reichstag: { build: reichstag },
  tiergarten: { build: tiergarten },
  alexanderplatz: { build: alexanderplatz },
  kreuzberg: { build: kreuzberg },
  charlottenburg: { build: charlottenburg },
  prenzlauerberg: { build: prenzlauerberg },
  citywest: { build: citywest },
  friedrichshain: { build: friedrichshain },
  museumsinsel: { build: museumsinsel },
  wannsee: { build: wannsee },
  tempelhof: { build: tempelhof },
  treptow: { build: treptow },
};

export const BLOCKS: BlockDef[] = PLAN.map((p) => ({ ...p, build: DRAWN[p.id]?.build ?? sampleFor(p.i, p.j) }));

export const ISLETS: IsletDef[] = ISLET_PLAN.map((p) => ({ ...p, build: DRAWN[p.id]?.build ?? (p.island ? () => {} : island) }));

/** The starter's stand-ins: a place drawn with one of these is not really drawn yet. */
const SAMPLES = new Set<BlockBuilder>([square, terrace, park, island]);

/** Places still borrowing a sample (or, for an island, drawing nothing). Empty before shipping. */
export const SAMPLED: string[] = [...PLAN, ...ISLET_PLAN].map((p) => p.id).filter((id) => !DRAWN[id] || SAMPLES.has(DRAWN[id].build));

/** The tour ends close in on the spot its last stop marks, if it marks one. */
const last = PLAN.find((p) => p.id === TOUR[TOUR.length - 1]);
const spot = last ? DRAWN[last.id]?.spot : undefined;
export const CLOSEUP = last && spot ? { x: blockOrigin(last.i, last.j)[0] + spot[0], y: blockOrigin(last.i, last.j)[1] + spot[1], zoom: spot[2] } : null;

export { TOUR };
