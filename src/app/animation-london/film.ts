// The film runner, with no framework in it and nothing of London either: it
// is handed a city once that has been drawn. First the drawing sketches itself
// in, then the camera tours each stop and ends close in on one small story,
// then it pulls back, evening falls, the lights come on, and the page fades to
// blank paper and starts again. The visitor can take the camera at any point.

import { C30, clamp, ease, lerp, paperX, paperY, smooth } from "./engine/math";
import { Mesh, Sprite, stamp } from "./engine/mesh";
import { Pen } from "./engine/pen";
import { Renderer } from "./engine/renderer";
import { MoveCtx, Mover, Stop } from "./scene/types";

export interface Caption {
  name: string;
  note: string;
}

export interface FilmOptions {
  /** Called when the camera arrives somewhere (or leaves: null). */
  onCaption?: (c: Caption | null) => void;
  /** Called once the city is built and the first frame is on screen. */
  onReady?: () => void;
  /** Called when the visitor takes or gives back the camera. */
  onExplore?: (exploring: boolean) => void;
  /** Called when the view changes between the whole city (true) and a close view (false). */
  onWide?: (wide: boolean) => void;
  /** Called when evening falls or lifts, so the page furniture can change colour with it. */
  onNight?: (night: boolean) => void;
  /** Called if the drawing stops for good: the graphics context was lost and came back unusable. */
  onError?: (err: unknown) => void;
  /** Hold the timeline at this second (for stills and tests). */
  freeze?: number | null;
  /** Start the timeline here instead of at the blank page. */
  startAt?: number | null;
  /** Called every frame with the milliseconds spent preparing and submitting it (for profiling). */
  onFrame?: (ms: number) => void;
  /** Start with the finished city and no tour: for visitors who prefer less motion. */
  still?: boolean;
  /** Debug camera: paper x, y and zoom in px per unit, or a stop id. */
  cam?: { x: number; y: number; zoom: number } | null;
  focus?: string | null;
  night?: number | null;
}

/** What a city hands to the film once it has been drawn. */
export interface Scene {
  mesh: Mesh;
  movers: Mover[];
  stops: Stop[];
  /** Paper-space bounds of what the wide view should frame. */
  bounds: { x0: number; y0: number; x1: number; y1: number };
  /** Timeline second by which the whole drawing is finished. */
  done: number;
  /** Timeline second from which nothing in the static drawing is still arriving. */
  settled: number;
}

/** What to film: how to draw the city, the order the camera visits its stops in, and where it ends. */
export interface Script<S extends Scene = Scene> {
  /** Draw the city. Called once, after the graphics context is known to work. */
  build: () => S;
  tour: string[];
  /** One small story to push right in on at the end of the tour (world position, zoom relative to a tour stop). */
  closeup?: { x: number; y: number; zoom: number } | null;
  /** The band of depth (x + y + z) the drawing lies in, when the renderer's own does not fit it. */
  depth?: { mid: number; half: number };
}

export interface Film<S extends Scene = Scene> {
  play(): void;
  pause(): void;
  readonly paused: boolean;
  restart(): void;
  /** Give the camera back to the tour. */
  resume(): void;
  /** Jump to a second of the timeline and stay there; null lets it run on from that point. */
  hold(t: number | null): void;
  /** Take the camera from the keyboard: move by so many pixels, and scale the zoom. */
  look(dx: number, dy: number, factor?: number): void;
  /** Point the debug camera somewhere else, or force night or day: for stills. */
  peek(o: { cam?: { x: number; y: number; zoom: number } | null; focus?: string | null; night?: number | null }): void;
  destroy(): void;
  readonly city: S;
  /** When each part of the loop happens, in timeline seconds. */
  readonly timeline: Timeline;
}

export interface Timeline {
  /** The drawing is complete. */
  built: number;
  tourStart: number;
  /** When the camera arrives at each stop. */
  arrivals: { id: string; at: number }[];
  /** When the camera arrives at the close-up, if there is one. */
  closeAt: number | null;
  tourEnd: number;
  /** Back to the whole city. */
  outEnd: number;
  duskStart: number;
  nightEnd: number;
  /** The page is blank again and the loop restarts. */
  end: number;
}

interface Key {
  t: number;
  x: number;
  y: number;
  /** log zoom */
  z: number;
  stop: Stop | null;
  /** How far the camera pulls back mid-move on its way to this key (log zoom). */
  hop: number;
}

/** Reveal time for things drawn straight into the moving layer: long ago, so they appear finished. */
const FINISHED = () => -1000;

/** Seconds the camera rests at a neighbourhood, at an island, and on the final close-up. */
const HOLD = 2.6;
const HOLD_QUICK = 1.7;
const CLOSE_TRAVEL = 1.5;
const CLOSE_HOLD = 2.9;

/** One move of the camera to a stop, and its stay there. */
export interface Leg {
  stop: Stop;
  /** Where the stop is on the paper. */
  px: number;
  py: number;
  /** Seconds the move takes, and the stay. */
  travel: number;
  hold: number;
  /** How far the camera pulls back mid-move (log zoom). */
  hop: number;
}

/** The camera's route: one leg per stop on the tour, with moves that take longer the further they go. */
export function planTour(stops: Stop[], tour: string[]): Leg[] {
  const legs: Leg[] = [];
  for (const id of tour) {
    const s = stops.find((q) => q.id === id);
    if (!s) continue;
    const px = paperX(s.x, s.y);
    const py = paperY(s.x, s.y, 4.5);
    const prev = legs[legs.length - 1];
    const d = prev ? Math.hypot(px - prev.px, py - prev.py) : 110;
    legs.push({ stop: s, px, py, travel: clamp(0.85 + d / 110, 1.25, 2.1), hold: s.quick ? HOLD_QUICK : HOLD, hop: prev ? clamp(d / 700, 0.07, 0.24) : 0 });
  }
  return legs;
}

/** When everything in one loop happens, given when the drawing is finished and the camera's route. */
export function planTimeline(built: number, legs: Leg[], closeup: boolean): Timeline {
  const tourStart = built + 1.4;
  const arrivals: { id: string; at: number }[] = [];
  let at = tourStart;
  for (const l of legs) {
    arrivals.push({ id: l.stop.id, at: at + l.travel });
    at += l.travel + l.hold;
  }
  const close = closeup && legs.length > 0;
  const tourEnd = at + (close ? CLOSE_TRAVEL + CLOSE_HOLD : 0);
  const outEnd = tourEnd + 2.7;
  const duskStart = outEnd + 0.5;
  const nightEnd = duskStart + 8.6;
  return { built, tourStart, arrivals, closeAt: close ? at + CLOSE_TRAVEL : null, tourEnd, outEnd, duskStart, nightEnd, end: nightEnd + 1.5 };
}

export function createFilm<S extends Scene>(canvas: HTMLCanvasElement, script: Script<S>, opts: FilmOptions = {}): Film<S> {
  const makeRenderer = (): Renderer => {
    const r = new Renderer(canvas);
    if (script.depth) {
      r.depthMid = script.depth.mid;
      r.depthHalf = script.depth.half;
    }
    return r;
  };
  let renderer = makeRenderer();
  const city = script.build();
  renderer.setStatic(city.mesh);

  const dyn = new Mesh(1 << 15, 1 << 15);
  const dynPen = new Pen(dyn, 99);
  dynPen.reveal = FINISHED;

  let cssW = 1;
  let cssH = 1;
  const b = city.bounds;
  const fullX = (b.x0 + b.x1) / 2;
  // The whole city in view, with a strip along the top left clear for the title.
  let band = 54;
  const fullZoom = () => Math.min(cssW / ((b.x1 - b.x0) * 1.04), Math.max(8, cssH - band) / ((b.y1 - b.y0) * 1.04));
  const fullY = () => (b.y0 + b.y1) / 2 - band / 2 / fullZoom();
  const tourZoom = () => Math.min(cssW / 104, cssH / 66);

  // ---- timeline
  const legs = planTour(city.stops, script.tour);
  const closeup = script.closeup ?? null;
  const timeline = planTimeline(city.done, legs, closeup != null);
  const { tourStart, outEnd, duskStart, nightEnd } = timeline;
  const fadeEnd = timeline.end;
  // tell each place when the camera arrives, so its set pieces can happen while it is there
  if (!opts.still) {
    legs.forEach((l, i) => (l.stop.at = timeline.arrivals[i].at));
    if (timeline.closeAt != null) legs[legs.length - 1].stop.closeAt = timeline.closeAt;
  }

  let keys: Key[] = [];
  const rekey = () => {
    const fz = Math.log(fullZoom());
    const tz = Math.log(tourZoom());
    const fy = fullY();
    keys = [
      { t: 0, x: fullX, y: fy, z: fz, stop: null, hop: 0 },
      { t: tourStart, x: fullX, y: fy, z: fz + 0.02, stop: null, hop: 0 },
    ];
    let t = tourStart;
    for (const l of legs) {
      const z = tz + Math.log(l.stop.zoom);
      keys.push({ t: t + l.travel, x: l.px, y: l.py, z, stop: l.stop, hop: l.hop });
      keys.push({ t: t + l.travel + l.hold, x: l.px + 1.5, y: l.py - 0.75, z: z + 0.04, stop: l.stop, hop: 0 });
      t += l.travel + l.hold;
    }
    if (closeup && legs.length > 0) {
      const last = legs[legs.length - 1].stop;
      const px = paperX(closeup.x, closeup.y);
      const py = paperY(closeup.x, closeup.y, 4);
      const z = tz + Math.log(closeup.zoom);
      keys.push({ t: t + CLOSE_TRAVEL, x: px, y: py, z, stop: last, hop: 0 });
      keys.push({ t: t + CLOSE_TRAVEL + CLOSE_HOLD, x: px + 0.5, y: py - 0.2, z: z + 0.05, stop: last, hop: 0 });
    }
    keys.push({ t: outEnd, x: fullX, y: fy, z: fz + 0.02, stop: null, hop: 0 });
    keys.push({ t: fadeEnd, x: fullX, y: fy, z: fz + 0.05, stop: null, hop: 0 });
  };

  const camAt = (t: number): { x: number; y: number; zoom: number; stop: Stop | null } => {
    let i = 0;
    while (i < keys.length - 2 && t > keys[i + 1].t) i++;
    const a = keys[i];
    const k = keys[i + 1];
    const u = clamp((t - a.t) / Math.max(1e-6, k.t - a.t), 0, 1);
    // between two keys at the same place the camera only drifts; anything that changes zoom is a move
    const holding = a.stop !== null && a.stop === k.stop && Math.abs(a.z - k.z) < 0.2;
    const e = holding || i === 0 || i === keys.length - 2 ? u : ease.inOut(u);
    // the camera pulls back a little in the middle of a move, more the further it has to go
    const hop = Math.sin(Math.PI * e) * k.hop;
    return {
      x: lerp(a.x, k.x, e),
      y: lerp(a.y, k.y, e),
      zoom: Math.exp(lerp(a.z, k.z, e) - hop),
      stop: holding || a.stop === k.stop ? a.stop : u > 0.72 ? k.stop : null,
    };
  };

  // ---- state
  let t = opts.still ? outEnd : (opts.startAt ?? 0);
  let held: number | null = opts.freeze ?? null;
  let clock = 0;
  let playing = true;
  let raf = 0;
  let last = 0;
  let disposed = false;
  /** Something other than time has changed (the size, the camera) and the picture needs drawing again. */
  let dirty = true;
  let caption: Stop | null = null;
  let dark = false;
  let exploring = false;
  let wide = true;
  const user = { x: fullX, y: (b.y0 + b.y1) / 2, zoom: 1 };
  // the debug camera and forced night can be changed while it runs (stills)
  const dbg = { cam: opts.cam ?? null, focus: opts.focus ?? null, night: opts.night ?? null };

  const view: [number, number, number, number] = [0, 0, 0, 0];
  // (with a forced night, for stills, the fireworks run on a fixed clock so any frozen second can be inspected)
  const nightAt = dbg.night != null ? 5.7 : duskStart + 2.4;
  const mc: MoveCtx = {
    mesh: dyn,
    pen: dynPen,
    t: 0,
    clock: 0,
    night: 0,
    nightAt,
    put(s: Sprite, x: number, y: number, z: number, t0: number, scale = 1) {
      if (mc.t < t0) return;
      const px = (x - y) * C30;
      const py = (x + y) * 0.5 - z;
      if (px < view[0] - 16 || px > view[2] + 16 || py < view[1] - 22 || py > view[3] + 14) return;
      stamp(dyn, s, x, y, z, t0, scale);
    },
    sees(x: number, y: number, z: number, slack = 16) {
      const px = (x - y) * C30;
      const py = (x + y) * 0.5 - z;
      return !(px < view[0] - slack || px > view[2] + slack || py < view[1] - slack - 6 || py > view[3] + slack);
    },
  };

  // Pixel density: the screen's own, up to 2, stepped down if this machine cannot keep up.
  let density = 2;
  let slow = 0;
  let lost = false;
  const resize = () => {
    const r = canvas.getBoundingClientRect();
    cssW = Math.max(1, r.width);
    cssH = Math.max(1, r.height);
    // the title's strip is sized in rem, like the title
    band = 3.5 * (parseFloat(getComputedStyle(document.documentElement).fontSize) || 16);
    renderer.resize(cssW, cssH, Math.min(window.devicePixelRatio || 1, density));
    rekey();
    // Changing a canvas's size wipes it. Draw again straight away, or the
    // page shows a blank frame at every step of a window being dragged wider.
    dirty = true;
    if (!lost && !first) draw();
  };

  const frame = (now: number) => {
    if (disposed) return;
    raf = requestAnimationFrame(frame);
    const gap = last ? now - last : 0;
    const dt = Math.min(0.05, gap / 1000);
    last = now;
    if (lost) return;
    const running = held == null && playing && !opts.still;
    if (running) {
      // A run of slow frames (under 25 a second) drops the resolution a notch.
      // A display that is merely capped at 30 a second, as phones are when
      // saving power, stays sharp.
      if (gap > 40 && gap < 250) {
        if (++slow > 45 && density > 1 && (window.devicePixelRatio || 1) > 1) {
          density = Math.max(1, Math.min(density, window.devicePixelRatio || 1) - 0.5);
          slow = 0;
          resize();
        }
      } else if (slow > 0) slow--;
      // the wind and the water run on their own clock, and stop when the film is paused
      t += dt;
      clock += dt;
      if (t >= fadeEnd) t = 0;
    } else if (held != null) {
      // held frames are repeatable: the wind and the water follow the timeline too
      t = held;
      clock = held;
    } else if (opts.still) t = outEnd;
    // With time standing still (paused, held, or reduced motion) the picture
    // only needs drawing when something else has changed.
    if (!running && !dirty) return;
    if (opts.onFrame) {
      const t0 = performance.now();
      draw();
      opts.onFrame(performance.now() - t0);
    } else draw();
  };

  let first = true;
  const draw = () => {
    let cam = camAt(t);
    if (dbg.focus) {
      const s = city.stops.find((q) => q.id === dbg.focus);
      if (s) cam = { x: paperX(s.x, s.y), y: paperY(s.x, s.y, 4.5), zoom: tourZoom() * s.zoom, stop: s };
    }
    if (dbg.cam) cam = { ...dbg.cam, stop: null };
    if (exploring) cam = { x: user.x, y: user.y, zoom: user.zoom, stop: null };
    const nowWide = !exploring && cam.zoom < fullZoom() * 1.3;
    if (nowWide !== wide) {
      wide = nowWide;
      opts.onWide?.(wide);
    }
    if (cam.stop !== caption) {
      caption = cam.stop;
      opts.onCaption?.(caption ? { name: caption.name, note: caption.note } : null);
    }
    const hw = cssW / 2 / cam.zoom;
    const hh = cssH / 2 / cam.zoom;
    view[0] = cam.x - hw;
    view[1] = cam.y - hh;
    view[2] = cam.x + hw;
    view[3] = cam.y + hh;
    const night = dbg.night != null ? dbg.night : opts.still ? 0 : smooth(duskStart, duskStart + 2.6, t) * (1 - smooth(nightEnd - 0.2, fadeEnd, t));
    dyn.clear();
    mc.t = t;
    mc.clock = clock;
    mc.night = night;
    const movers = city.movers;
    for (let i = 0; i < movers.length; i++) {
      // each mover starts from the same pen every frame, so anything it draws by hand holds still
      dynPen.rng.reset(7919 + i);
      dynPen.reveal = FINISHED;
      movers[i](mc);
    }
    const fade = opts.still ? 0 : smooth(nightEnd, fadeEnd - 0.25, t);
    if (night > 0.5 !== dark) {
      dark = night > 0.5;
      opts.onNight?.(dark);
    }
    renderer.draw({ time: t, clock, camX: cam.x, camY: cam.y, zoom: cam.zoom, night, fade, dyn, settled: t > city.settled });
    dirty = false;
    if (first) {
      first = false;
      opts.onReady?.();
    }
  };

  // ---- taking the camera: drag to pan, wheel or pinch to zoom
  const pointers = new Map<number, { x: number; y: number; sx: number; sy: number; moved: boolean }>();
  let pinch = 0;
  const startExplore = () => {
    if (exploring) return;
    const c = camAt(t);
    user.x = c.x;
    user.y = c.y;
    user.zoom = c.zoom;
    exploring = true;
    opts.onExplore?.(true);
  };
  const limit = () => {
    user.zoom = clamp(user.zoom, fullZoom() * 0.8, tourZoom() * 5);
    user.x = clamp(user.x, b.x0, b.x1);
    user.y = clamp(user.y, b.y0, b.y1);
  };
  const onDown = (e: PointerEvent) => {
    // only the main mouse button drags: a right click opens a menu and its release is never reported
    if (e.pointerType === "mouse" && e.button !== 0) return;
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      // the pointer is already gone; the drag simply ends when it leaves the canvas
    }
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, moved: false });
    if (pointers.size === 2) {
      const [p, q] = [...pointers.values()];
      pinch = Math.hypot(p.x - q.x, p.y - q.y);
    }
  };
  const onUp = (e: PointerEvent) => {
    pointers.delete(e.pointerId);
    pinch = 0;
  };
  const onMove = (e: PointerEvent) => {
    const p = pointers.get(e.pointerId);
    if (!p) return;
    // a mouse with no button down was released somewhere we did not hear about
    if (e.pointerType === "mouse" && e.buttons === 0) {
      onUp(e);
      return;
    }
    const dx = e.clientX - p.x;
    const dy = e.clientY - p.y;
    p.x = e.clientX;
    p.y = e.clientY;
    // a press becomes a drag once it has travelled a few pixels, however slowly
    if (!p.moved) {
      if (pointers.size === 1 && Math.hypot(p.x - p.sx, p.y - p.sy) < 3) return;
      p.moved = true;
    }
    startExplore();
    if (pointers.size === 1) {
      user.x -= dx / user.zoom;
      user.y -= dy / user.zoom;
    } else if (pointers.size === 2) {
      const [a, c] = [...pointers.values()];
      const d = Math.hypot(a.x - c.x, a.y - c.y);
      if (pinch > 0 && d > 0) {
        // zoom about the point between the two fingers
        const r = canvas.getBoundingClientRect();
        const mx = (a.x + c.x) / 2 - r.left - cssW / 2;
        const my = (a.y + c.y) / 2 - r.top - cssH / 2;
        const wx = user.x + mx / user.zoom;
        const wy = user.y + my / user.zoom;
        user.zoom *= d / pinch;
        limit();
        user.x = wx - mx / user.zoom;
        user.y = wy - my / user.zoom;
      }
      pinch = d;
      // the fingers carry the map with them: one finger's move shifts their midpoint by half as much
      user.x -= dx / 2 / user.zoom;
      user.y -= dy / 2 / user.zoom;
    }
    limit();
    dirty = true;
  };
  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    // a mouse wheel may count in lines or pages instead of pixels (Firefox does)
    const dy = e.deltaMode === 1 ? e.deltaY * 32 : e.deltaMode === 2 ? e.deltaY * 600 : e.deltaY;
    // a sideways swipe is not a zoom, and no reason to leave the tour
    if (dy === 0) return;
    startExplore();
    const r = canvas.getBoundingClientRect();
    const mx = e.clientX - r.left - cssW / 2;
    const my = e.clientY - r.top - cssH / 2;
    const wx = user.x + mx / user.zoom;
    const wy = user.y + my / user.zoom;
    // ctrl is how browsers report a trackpad pinch: small numbers, so each counts for more
    user.zoom *= Math.exp(-dy * (e.ctrlKey ? 0.012 : 0.0016));
    limit();
    user.x = wx - mx / user.zoom;
    user.y = wy - my / user.zoom;
    limit();
    dirty = true;
  };
  // Desktop Safari reports a trackpad pinch as gesture events of its own, and
  // zooms the whole page unless they are answered. (On a touch screen the
  // fingers are already followed one by one, above.)
  let gesture = 1;
  const onGestureStart = (e: Event) => {
    e.preventDefault();
    gesture = 1;
  };
  const onGestureChange = (e: Event) => {
    e.preventDefault();
    const scale = (e as Event & { scale?: number }).scale;
    if (!scale || pointers.size > 0) return;
    startExplore();
    user.zoom *= scale / gesture;
    gesture = scale;
    limit();
    dirty = true;
  };
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onUp);
  canvas.addEventListener("lostpointercapture", onUp);
  canvas.addEventListener("wheel", onWheel, { passive: false });
  canvas.addEventListener("gesturestart", onGestureStart);
  canvas.addEventListener("gesturechange", onGestureChange);
  // If the browser takes the graphics context away (a sleeping tab, a driver
  // reset), wait for it to come back and hand the city to the new one.
  const onLost = (e: Event) => {
    e.preventDefault();
    lost = true;
  };
  const onRestored = () => {
    try {
      renderer = makeRenderer();
      renderer.setStatic(city.mesh);
    } catch (err) {
      // it came back unusable: say so, rather than leave a frozen picture with live-looking buttons
      opts.onError?.(err);
      return;
    }
    lost = false;
    resize();
  };
  canvas.addEventListener("webglcontextlost", onLost);
  canvas.addEventListener("webglcontextrestored", onRestored);
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  // The pixel ratio can change with no change of size: the window moves to
  // another screen, or the page is zoomed. A media query on the current ratio
  // fires when it stops being true.
  let ratio: MediaQueryList | null = null;
  const onRatio = () => {
    ratio?.removeEventListener("change", onRatio);
    ratio = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
    ratio.addEventListener("change", onRatio);
    resize();
  };
  onRatio();
  raf = requestAnimationFrame(frame);

  return {
    city,
    timeline,
    play() {
      playing = true;
    },
    pause() {
      playing = false;
    },
    get paused() {
      return !playing;
    },
    restart() {
      t = 0;
      playing = true;
      dirty = true;
      if (exploring) {
        exploring = false;
        opts.onExplore?.(false);
      }
    },
    resume() {
      if (!exploring) return;
      exploring = false;
      dirty = true;
      opts.onExplore?.(false);
    },
    hold(at) {
      held = at;
      dirty = true;
    },
    look(dx, dy, factor = 1) {
      startExplore();
      user.x += dx / user.zoom;
      user.y += dy / user.zoom;
      user.zoom *= factor;
      limit();
      dirty = true;
    },
    peek(o) {
      if (o.cam !== undefined) dbg.cam = o.cam;
      if (o.focus !== undefined) dbg.focus = o.focus;
      if (o.night !== undefined) {
        dbg.night = o.night;
        mc.nightAt = dbg.night != null ? 5.7 : duskStart + 2.4;
      }
      dirty = true;
    },
    destroy() {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      ratio?.removeEventListener("change", onRatio);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      canvas.removeEventListener("lostpointercapture", onUp);
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("gesturestart", onGestureStart);
      canvas.removeEventListener("gesturechange", onGestureChange);
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      if (!lost) renderer.dispose();
      // hand the drawing buffer's memory back now, not whenever the canvas happens to be collected
      canvas.width = 1;
      canvas.height = 1;
    },
  };
}
