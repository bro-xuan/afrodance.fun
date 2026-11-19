// Where every place sits, when it starts to draw, what its caption says, and
// the camera's route. The drawings live one file per place and are wired up
// in index.ts.
//
// North is the upper right of the page and east the lower right, so the
// columns run west to east and the rows north to south:
//
//                 (0,0) Charlottenburg
//          (0,1) Tiergarten     (1,0) Reichstag
//   (0,2) City West    (1,1) Brandenburger Tor   (2,0) Prenzlauer Berg
//          (1,2) Kreuzberg  ~Spree~  (2,1) Alexanderplatz
//                 (2,2) Friedrichshain
//
// The city grows from the Gate outwards, about 0.4 s apart. Captions are the
// place's name and one line of what you can see there, short enough to read
// in two seconds.

import { AXIS_W, AXIS_Y, BlockDef, COL_X, GRID_X, GRID_Y, ISLAND, IsletDef, MARGIN, ROW_Y } from "../city";

export type BlockPlan = Omit<BlockDef, "build">;
export type IsletPlan = Omit<IsletDef, "build">;

/** Where the axis leaves a block for its bridge to the island: no railing there (local y, along the bank). */
const AXIS_GAP: [number, number] = [AXIS_Y - ROW_Y[1] - AXIS_W / 2 - 0.3, AXIS_Y - ROW_Y[1] + AXIS_W / 2 + 0.3];

export const PLAN: BlockPlan[] = [
  { id: "brandenburgertor", i: 1, j: 1, t: 0.4, name: "Brandenburger Tor", note: "the Quadriga looks down Unter den Linden", gaps: [AXIS_GAP] },
  { id: "reichstag", i: 1, j: 0, t: 1.0, name: "Reichstag", note: "a glass dome over the parliament", gaps: [[17, 33]], quiet: [[7, 17]] },
  { id: "tiergarten", i: 0, j: 1, t: 1.4, name: "Tiergarten", note: "Goldelse on her column, above the trees" },
  { id: "alexanderplatz", i: 2, j: 1, t: 1.8, name: "Alexanderplatz", note: "the TV tower and the World Clock", gaps: [AXIS_GAP] },
  { id: "kreuzberg", i: 1, j: 2, t: 2.2, name: "Kreuzberg", note: "Checkpoint Charlie, döner and a swim in the Spree", gaps: [[22, 28]] },
  { id: "charlottenburg", i: 0, j: 0, t: 2.6, name: "Schloss Charlottenburg", note: "a queen's summer palace and its garden" },
  { id: "prenzlauerberg", i: 2, j: 0, t: 3.0, name: "Prenzlauer Berg", note: "Sunday karaoke in the Mauerpark" },
  { id: "citywest", i: 0, j: 2, t: 3.4, name: "City West", note: "the broken church on the Ku'damm" },
  { id: "friedrichshain", i: 2, j: 2, t: 3.8, name: "Friedrichshain", note: "the Wall, painted; the U1 over the Oberbaumbrücke" },
];

// The places off the grid. Each gets a 40 x 40 local frame round its centre,
// standing on the paper. Three sit in the corners the diamond leaves empty;
// Museum Island sits in the river, on ground the city lays for it, and its
// frame starts at the island's north-west corner.
export const ISLET_PLAN: IsletPlan[] = [
  { id: "museumsinsel", x: ISLAND.x0 + 20, y: ISLAND.y0 + 20, t: 2.0, name: "Museumsinsel", note: "the cathedral and the museums, on an island in the Spree", island: true, quick: false },
  { id: "wannsee", x: -MARGIN - 52, y: ROW_Y[1] + 12, t: 4.3, name: "Wannsee", note: "pack your swimming things" },
  { id: "tempelhof", x: COL_X[1] + 18, y: GRID_Y + MARGIN + 54, t: 4.6, name: "Tempelhofer Feld", note: "an airport handed over to kites and skates" },
  { id: "treptow", x: GRID_X + MARGIN + 36, y: ROW_Y[1] + 44, t: 4.9, name: "Treptower Park", note: "the old big wheel in the woods" },
];

/** The camera's route: down the west, along the south, up the east, and in to the island and the Gate last. */
export const TOUR: string[] = [
  "charlottenburg",
  "tiergarten",
  "wannsee",
  "citywest",
  "tempelhof",
  "kreuzberg",
  "friedrichshain",
  "treptow",
  "alexanderplatz",
  "prenzlauerberg",
  "reichstag",
  "museumsinsel",
  "brandenburgertor",
];
