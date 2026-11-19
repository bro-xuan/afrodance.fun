// Where every neighbourhood and islet sits, when it starts to draw, and the
// route the camera takes. The drawings themselves live one file per place.

import { BlockDef, IsletDef } from "../city";

export type BlockPlan = Omit<BlockDef, "build">;
export type IsletPlan = Omit<IsletDef, "build">;

// i counts columns from the west, j rows from the north; row 2 is the south bank.
export const PLAN: BlockPlan[] = [
  { id: "stpauls", i: 1, j: 1, t: 0.9, name: "St Paul's", note: "Wren's dome, and a footbridge that used to wobble" },
  { id: "westminster", i: 0, j: 1, t: 1.3, name: "Westminster", note: "Big Ben is the bell, not the tower" },
  { id: "tower", i: 2, j: 1, t: 1.7, name: "The Tower", note: "ravens, Beefeaters, and a bridge that opens" },
  { id: "westend", i: 1, j: 0, t: 2.1, name: "West End", note: "Nelson up his column, the lights of Piccadilly" },
  { id: "southbank", i: 0, j: 2, t: 2.5, name: "South Bank", note: "the Eye takes half an hour to go round" },
  { id: "bankside", i: 1, j: 2, t: 2.9, name: "Bankside", note: "a power station full of art, a playhouse open to the sky" },
  { id: "londonbridge", i: 2, j: 2, t: 3.3, name: "London Bridge", note: "the Shard, and lunch at Borough Market" },
  { id: "palace", i: 0, j: 0, t: 3.7, name: "Buckingham Palace", note: "the guard changes at eleven" },
  { id: "bloomsbury", i: 2, j: 0, t: 4.1, name: "Bloomsbury", note: "the British Museum, and the train to Paris" },
];

// Islets float off the four corners of the page. Each gets a 40 x 40 local frame around its centre.
export const ISLET_PLAN: IsletPlan[] = [
  { id: "nottinghill", x: -78, y: 60, t: 4.6, name: "Notting Hill", note: "carnival comes down Portobello Road" },
  { id: "camden", x: 100, y: -72, t: 4.9, name: "Camden Lock", note: "narrowboats, market stalls and mohawks" },
  { id: "greenwich", x: 272, y: 112, t: 5.2, name: "Greenwich", note: "one foot in each hemisphere" },
  { id: "wimbledon", x: 72, y: 268, t: 5.5, name: "Wimbledon", note: "strawberries, cream, and new balls please" },
];

/** The camera's route: down the river and back up the far side of town, calling at each islet on the way, then in to the palace. */
export const TOUR: string[] = [
  "westminster",
  "southbank",
  "wimbledon",
  "bankside",
  "londonbridge",
  "greenwich",
  "tower",
  "stpauls",
  "bloomsbury",
  "camden",
  "westend",
  "nottinghill",
  "palace",
];
