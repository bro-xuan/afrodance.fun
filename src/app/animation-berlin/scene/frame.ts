// The shape of the city. Decide this first: grid.ts reads nothing else to lay
// out the ground, and every place in blocks/ is drawn inside it.
//
// Blocks are squares in a grid with a street between neighbours. The camera
// looks at the grid corner-on, so block (0, 0) is at the top of the page,
// i runs down to the lower right and j down to the lower left.
//
// Berlin is turned so that north is the upper right of the page and east the
// lower right. That puts the city's great axis (Siegessäule, Brandenburg Gate,
// Unter den Linden, the cathedral, the TV tower) on one straight line through
// the middle row, and lets the Quadriga look towards the viewer, as she looks
// east into the city. The Spree runs between the second and third columns,
// from the lower left edge of the grid (south) to the upper right (north).
//
//                 (0,0) Charlottenburg
//          (0,1) Tiergarten     (1,0) Reichstag
//   (0,2) City West    (1,1) Brandenburger Tor   (2,0) Prenzlauer Berg
//          (1,2) Kreuzberg  ~Spree~  (2,1) Alexanderplatz
//                 (2,2) Friedrichshain

export interface Frame {
  /** Streets run between the blocks, on one base that also carries a ring road round the outside. */
  lanes: "street";
  /** Blocks along i (towards the lower right) and along j (towards the lower left). */
  cols: number;
  rows: number;
  /** Side of a block and width of a street, in world units. A person is about 2.2 tall, a house 6 to 9 wide. */
  block: number;
  lane: number;
  /** The Spree takes the place of the street after this column, and is this wide. */
  river: { after: number; width: number };
  /** Fireworks over the city once night falls. */
  fireworks: boolean;
  /**
   * Seconds the camera stays at a place, at an island, and on the final
   * close-up. The loop is about 15 s plus (move + stay) per stop plus the
   * close-up.
   */
  pace: { hold: number; holdQuick: number; closeHold: number };
}

export const FRAME: Frame = {
  lanes: "street",
  cols: 3,
  rows: 3,
  block: 48,
  lane: 13,
  river: { after: 1, width: 34 },
  fireworks: true,
  pace: { hold: 2.5, holdQuick: 1.7, closeHold: 3.0 },
};
