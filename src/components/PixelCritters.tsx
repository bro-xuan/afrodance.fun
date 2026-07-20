import type { CSSProperties } from "react";
import PixelSprite from "@/components/PixelSprite";
import type { SpriteDef } from "@/data/sprites";

export type CritterBehavior =
  // time-based
  | "hop" //          squash-hop in place
  | "bob" //          gentle idle bob
  | "float" //        lazy vertical float + tilt (ghost)
  | "patrol" //       walks back and forth, flipping to face its heading
  | "flutter" //      loopy drifting flight (butterfly)
  | "buzz" //         fast vibration (bee)
  | "swim" //         side-to-side sway (fish)
  | "sway" //         pendulum sway (hung/plant)
  // scroll-driven
  | "walk-scroll" //  walks sideways as its section scrolls through view
  | "hop-scroll" //   hops once as it enters view
  | "rise-scroll" //  drifts up as its section traverses the viewport
  | "spin-scroll" //  spins as its section scrolls
  | "peek-scroll" //  pops up from below as it enters
  // hover-interactive (pointer events on; reacts on hover, shows an emote)
  | "hover-jump"
  | "hover-spin"
  | "hover-wiggle";

export type Critter = {
  sprite: SpriteDef;
  /** Tailwind position utilities, e.g. "left-[2%] top-[30%]" */
  pos: string;
  /** CSS width, e.g. "2.75rem" */
  width: string;
  behavior: CritterBehavior;
  facing?: "left" | "right";
  /** animation-delay for time-based behaviors */
  delay?: string;
  /** travel distance for patrol / walk-scroll, e.g. "6rem" */
  range?: string;
  /** frame-swap cadence for the walk cycle */
  frameDur?: string;
  /** tiny sprite that pops above an interactive critter on hover */
  emote?: SpriteDef;
};

const behaviorClass: Record<CritterBehavior, string> = {
  hop: "critter-hop",
  bob: "critter-bob",
  float: "critter-float",
  patrol: "critter-patrol",
  flutter: "critter-flutter",
  buzz: "critter-buzz",
  swim: "critter-swim",
  sway: "critter-sway",
  "walk-scroll": "critter-walk-scroll",
  "hop-scroll": "critter-hop-scroll",
  "rise-scroll": "critter-rise-scroll",
  "spin-scroll": "critter-spin-scroll",
  "peek-scroll": "critter-peek-scroll",
  "hover-jump": "critter-hover-jump",
  "hover-spin": "critter-hover-spin",
  "hover-wiggle": "critter-hover-wiggle",
};

// patrol flips itself in its keyframes, so static facing must not also flip it.
const selfFlipping = new Set<CritterBehavior>(["patrol"]);

// Decorative critters that come alive on scroll and hover. Same overlay pattern
// as DriftPixels: an absolutely-positioned, non-interactive layer per section —
// except hover critters re-enable pointer events on just their own sprite box.
export default function PixelCritters({
  critters,
  className,
}: {
  critters: Critter[];
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 ${className ?? ""}`}
    >
      {critters.map((c, i) => {
        const interactive = c.behavior.startsWith("hover-");
        const flip = c.facing === "left" && !selfFlipping.has(c.behavior);
        // A right-anchored patrol paces inward (into the page); a left-anchored
        // one paces rightward. Without this, right-edge critters walk off a
        // clipped section edge.
        const patrolDir =
          c.behavior === "patrol" && c.pos.includes("right-") ? -1 : 1;
        return (
          <span
            key={i}
            className={`critter absolute ${c.pos}${
              interactive ? " critter-interactive pointer-events-auto" : ""
            }`}
          >
            {interactive && c.emote && (
              <span className="critter-emote">
                <PixelSprite def={c.emote} width="1.3rem" />
              </span>
            )}
            <span
              className={behaviorClass[c.behavior]}
              style={
                {
                  "--crange": c.range,
                  "--cdir": patrolDir,
                  animationDelay: c.delay,
                } as CSSProperties
              }
            >
              <span
                className="inline-block"
                style={flip ? { transform: "scaleX(-1)" } : undefined}
              >
                <PixelSprite def={c.sprite} width={c.width} frameDur={c.frameDur} />
              </span>
            </span>
          </span>
        );
      })}
    </div>
  );
}
