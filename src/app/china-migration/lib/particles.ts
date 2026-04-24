import type { Particle } from "../types";

const TRAIL_LENGTH = 80;

export function createParticle(
  pairKey: string,
  partnerCode: number,
  direction: "outbound" | "inbound",
  start: [number, number],
  end: [number, number],
  speed: number
): Particle {
  // Quadratic-bezier control point: midpoint pushed perpendicular by ~22% of
  // distance, so the path arches toward the upper hemisphere of the screen
  // (negative Y in canvas coords).
  const mx = (start[0] + end[0]) / 2;
  const my = (start[1] + end[1]) / 2;
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const dist = Math.hypot(dx, dy);
  const nx = -dy / (dist || 1);
  const ny = dx / (dist || 1);
  // Always arch upward (negative y on canvas). Pick the perpendicular direction
  // that points up; if neither, default to (nx, ny).
  const perpUp = ny < 0 ? [nx, ny] : [-nx, -ny];
  const arcHeight = Math.min(dist * 0.22, 110);
  return {
    pairKey,
    partnerCode,
    direction,
    startX: start[0],
    startY: start[1],
    endX: end[0],
    endY: end[1],
    ctrlX: mx + perpUp[0] * arcHeight,
    ctrlY: my + perpUp[1] * arcHeight,
    t: 0,
    speed,
    trail: [],
  };
}

function bezierAt(p: Particle, t: number): [number, number] {
  // Linear t along the bezier — distributes particles evenly along the arc
  // so the eye reads them as flowing rather than clumping at endpoints.
  const inv = 1 - t;
  const x = inv * inv * p.startX + 2 * inv * t * p.ctrlX + t * t * p.endX;
  const y = inv * inv * p.startY + 2 * inv * t * p.ctrlY + t * t * p.endY;
  return [x, y];
}

export function stepParticles(particles: Particle[], dt: number): Particle[] {
  const alive: Particle[] = [];
  for (const p of particles) {
    p.t += p.speed * dt;
    if (p.t >= 1) continue;
    const [x, y] = bezierAt(p, p.t);
    p.trail.push({ x, y, t: p.t });
    if (p.trail.length > TRAIL_LENGTH) p.trail.shift();
    alive.push(p);
  }
  return alive;
}

export function drawParticles(
  ctx: CanvasRenderingContext2D,
  particles: Particle[],
  outboundColor: string,
  inboundColor: string
) {
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const p of particles) {
    const color = p.direction === "outbound" ? outboundColor : inboundColor;
    // Trail as a single stroked path with linearly fading alpha by drawing
    // segments at decreasing widths/alphas. Looks like a comet tail.
    const n = p.trail.length;
    if (n >= 2) {
      ctx.strokeStyle = color;
      for (let i = 0; i < n - 1; i++) {
        const t = (i + 1) / n; // 0 at oldest, 1 at newest
        ctx.globalAlpha = t * t * 0.7;
        ctx.lineWidth = 0.4 + t * 1.2;
        ctx.beginPath();
        ctx.moveTo(p.trail[i].x, p.trail[i].y);
        ctx.lineTo(p.trail[i + 1].x, p.trail[i + 1].y);
        ctx.stroke();
      }
    }
    // Head with subtle glow.
    const head = p.trail[n - 1];
    if (head) {
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(head.x, head.y, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.arc(head.x, head.y, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}
