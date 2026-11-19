// Where every neighbourhood and island sits, when it starts to draw, and the
// route the camera takes. The drawings themselves live one file per place.

import { BlockDef, IsletDef } from "../city";

export type BlockPlan = Omit<BlockDef, "build" | "land">;
export type IsletPlan = Omit<IsletDef, "build">;

export const PLAN: BlockPlan[] = [
  { id: "dam", i: 1, j: 1, t: 0.4, name: "Dam", note: "the Royal Palace, on the square the city grew around" },
  { id: "centraal", i: 0, j: 1, t: 1.0, name: "Centraal Station", note: "trains in front, ferries out the back" },
  { id: "rijks", i: 2, j: 1, t: 1.4, name: "Rijksmuseum", note: "the bike path runs straight through it" },
  { id: "nemo", i: 0, j: 0, t: 1.8, name: "Oosterdok", note: "NEMO's green hull and an East Indiaman" },
  { id: "windmill", i: 1, j: 0, t: 2.2, name: "De Gooyer & Artis", note: "a windmill with a brewery, and the zoo next door" },
  { id: "amstel", i: 2, j: 0, t: 2.6, name: "Amstel", note: "the Skinny Bridge opens for anything with a mast" },
  { id: "market", i: 2, j: 2, t: 3.0, name: "Markets", note: "tulips on the water, herring and stroopwafels on the street" },
  { id: "vondel", i: 1, j: 2, t: 3.4, name: "Vondelpark", note: "picnics, parakeets and the blue teahouse" },
  { id: "jordaan", i: 0, j: 2, t: 3.8, name: "Jordaan", note: "the Westertoren over the canal houses" },
];

// Islands float off the four corners of the page. Each gets a 40 x 40 local frame around its centre.
export const ISLET_PLAN: IsletPlan[] = [
  { id: "noord", x: -50, y: 88, t: 4.3, name: "Noord", note: "across the IJ by free ferry: the A'DAM tower and the EYE" },
  { id: "polder", x: 85, y: -58, t: 4.6, name: "The polder", note: "tulip fields in stripes, and windmills to keep them dry" },
  { id: "arena", x: 228, y: 85, t: 4.9, name: "The Arena", note: "match day" },
  { id: "schiphol", x: 85, y: 228, t: 5.2, name: "Schiphol", note: "everyone's way in" },
];

/** The camera's route: clockwise round the ring, swinging out to each island on the way, then in to the Dam. */
export const TOUR: string[] = [
  "centraal",
  "noord",
  "nemo",
  "polder",
  "windmill",
  "amstel",
  "arena",
  "rijks",
  "market",
  "schiphol",
  "vondel",
  "jordaan",
  "dam",
];
