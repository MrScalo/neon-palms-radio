/**
 * Palm silhouettes are built from a handful of hand-tuned numbers (trunk curve, frond angles,
 * lengths, droop) instead of stored path data: every palm on the page stays consistent, the
 * markup stays small and new variants are one object away. Pure and deterministic, so server
 * and client always agree on the output.
 */

export type Point = { x: number; y: number };

export type FrondSpec = {
  /** Direction the frond leaves the crown in degrees: 0 = right, -90 = up, 180 = left (y points down). */
  angle: number;
  length: number;
  /** How far the frond bends towards the ground over its length, in degrees. */
  droop: number;
  /** Length of the longest leaflet. */
  leaflet: number;
};

export type PalmSpec = {
  width: number;
  height: number;
  base: Point;
  crown: Point;
  /** Sideways pull of the trunk's middle; negative bows it to the left. */
  bow: number;
  baseWidth: number;
  topWidth: number;
  /** Number of leaf-scar rings notched into the trunk outline. */
  rings: number;
  fronds: FrondSpec[];
  coconuts: Array<Point & { r: number }>;
};

const rad = (deg: number) => (deg * Math.PI) / 180;
const num = (n: number) => String(Math.round(n));
const pt = (p: Point) => `${num(p.x)} ${num(p.y)}`;
const add = (a: Point, b: Point): Point => ({ x: a.x + b.x, y: a.y + b.y });
const scale = (a: Point, k: number): Point => ({ x: a.x * k, y: a.y * k });
const dir = (deg: number): Point => ({ x: Math.cos(rad(deg)), y: Math.sin(rad(deg)) });

function quadratic(p0: Point, p1: Point, p2: Point, t: number): Point {
  const u = 1 - t;
  return {
    x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
    y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y,
  };
}

function quadraticTangent(p0: Point, p1: Point, p2: Point, t: number): Point {
  const x = 2 * (1 - t) * (p1.x - p0.x) + 2 * t * (p2.x - p1.x);
  const y = 2 * (1 - t) * (p1.y - p0.y) + 2 * t * (p2.y - p1.y);
  const length = Math.hypot(x, y) || 1;
  return { x: x / length, y: y / length };
}

export function trunkPath(spec: PalmSpec): string {
  const { base, crown, bow, baseWidth, topWidth, rings } = spec;
  const control = { x: (base.x + crown.x) / 2 + bow, y: (base.y + crown.y) / 2 };
  const perRing = 4;
  const steps = rings * perRing;
  const sideA: Point[] = [];
  const sideB: Point[] = [];

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const p = quadratic(base, control, crown, t);
    const tangent = quadraticTangent(base, control, crown, t);
    const normal = { x: -tangent.y, y: tangent.x };
    // Each ring is widest at its lower edge, like the stacked leaf scars of a real trunk.
    const ring = 1 + 0.1 * (1 - (i % perRing) / perRing) ** 2;
    const flare = 1 + 0.7 * Math.max(0, 1 - t / 0.06) ** 2;
    const half = ((baseWidth + (topWidth - baseWidth) * t) * ring * flare) / 2;
    sideA.push(add(p, scale(normal, half)));
    sideB.push(add(p, scale(normal, -half)));
  }

  const outline = [...sideA, ...sideB.reverse()];
  return `M${outline.map(pt).join("L")}Z`;
}

type SpinePoint = { p: Point; angle: number };

export function frondPath(origin: Point, frond: FrondSpec): string {
  const steps = 18;
  const segment = frond.length / steps;
  // Fronds pointing left bend counter-clockwise to fall towards the ground.
  const bend = Math.cos(rad(frond.angle)) >= 0 ? 1 : -1;

  const spine: SpinePoint[] = [];
  let p = origin;
  for (let i = 0; i <= steps; i++) {
    const angle = frond.angle + bend * frond.droop * (i / steps) ** 1.25;
    spine.push({ p, angle });
    p = add(p, scale(dir(angle), segment));
  }

  const first = 2;
  const last = steps - 1;
  const halfBase = segment * 0.28;

  const leaflet = (i: number, side: "upper" | "lower") => {
    const { p: s, angle } = spine[i];
    const t = i / steps;
    const length = frond.leaflet * Math.sin(Math.PI * t) ** 0.55 * (1 - 0.3 * t);
    const rachis = 2.6 * (1 - t) + 0.8;
    const normal = dir(side === "upper" ? angle - 90 * bend : angle + 90 * bend);
    const sweep = side === "upper" ? angle - 34 * bend : angle + 46 * bend;
    const along = dir(angle);
    const root = add(s, scale(normal, rachis));
    const b1 = add(root, scale(along, -halfBase));
    const b2 = add(root, scale(along, halfBase));
    const tip = add(root, scale(dir(sweep), length));
    // Leaflets sag under their own weight: pull both edge curves down a little.
    const sag = { x: 0, y: length * 0.4 };
    const c1 = add(scale(add(b1, tip), 0.5), sag);
    const c2 = add(scale(add(b2, tip), 0.5), sag);
    return { b1, b2, tip, c1, c2 };
  };

  let d = `M${pt(origin)}`;
  for (let i = first; i <= last; i++) {
    const l = leaflet(i, "upper");
    d += `L${pt(l.b1)}Q${pt(l.c1)} ${pt(l.tip)}Q${pt(l.c2)} ${pt(l.b2)}`;
  }
  d += `L${pt(spine[steps].p)}`;
  for (let i = last; i >= first; i--) {
    const l = leaflet(i, "lower");
    d += `L${pt(l.b2)}Q${pt(l.c2)} ${pt(l.tip)}Q${pt(l.c1)} ${pt(l.b1)}`;
  }
  return `${d}Z`;
}

export type PalmShape = {
  width: number;
  height: number;
  /** Trunk base as a fraction of the viewBox, used as the sway pivot. */
  pivot: Point;
  trunk: string;
  fronds: string[];
  crown: Point;
  coconuts: Array<Point & { r: number }>;
};

export function buildPalm(spec: PalmSpec): PalmShape {
  return {
    width: spec.width,
    height: spec.height,
    pivot: { x: spec.base.x / spec.width, y: spec.base.y / spec.height },
    trunk: trunkPath(spec),
    fronds: spec.fronds.map((frond) => frondPath(spec.crown, frond)),
    crown: spec.crown,
    coconuts: spec.coconuts,
  };
}

/** Tall palm leaning to the right, crown high in the frame. */
const TALL: PalmSpec = {
  width: 640,
  height: 1000,
  base: { x: 300, y: 1000 },
  crown: { x: 372, y: 196 },
  bow: -58,
  baseWidth: 38,
  topWidth: 17,
  rings: 26,
  fronds: [
    { angle: -14, length: 290, droop: 105, leaflet: 64 },
    { angle: -40, length: 250, droop: 85, leaflet: 58 },
    { angle: -68, length: 200, droop: 62, leaflet: 50 },
    { angle: -100, length: 180, droop: 60, leaflet: 46 },
    { angle: -132, length: 236, droop: 84, leaflet: 56 },
    { angle: -160, length: 280, droop: 104, leaflet: 62 },
    { angle: 170, length: 220, droop: 80, leaflet: 52 },
    { angle: 12, length: 220, droop: 80, leaflet: 52 },
    { angle: 100, length: 120, droop: 10, leaflet: 28 },
    { angle: 76, length: 110, droop: 10, leaflet: 26 },
  ],
  coconuts: [
    { x: 362, y: 214, r: 9 },
    { x: 380, y: 218, r: 8 },
    { x: 370, y: 228, r: 7 },
  ],
};

/** Shorter palm with a stronger lean, for depth and for the sun window. */
const SHORT: PalmSpec = {
  width: 640,
  height: 1000,
  base: { x: 380, y: 1000 },
  crown: { x: 262, y: 392 },
  bow: 70,
  baseWidth: 40,
  topWidth: 19,
  rings: 18,
  fronds: [
    { angle: -18, length: 270, droop: 100, leaflet: 60 },
    { angle: -48, length: 226, droop: 80, leaflet: 54 },
    { angle: -82, length: 180, droop: 58, leaflet: 46 },
    { angle: -114, length: 200, droop: 70, leaflet: 50 },
    { angle: -146, length: 250, droop: 92, leaflet: 58 },
    { angle: -176, length: 270, droop: 104, leaflet: 60 },
    { angle: 158, length: 200, droop: 76, leaflet: 48 },
    { angle: 22, length: 196, droop: 76, leaflet: 48 },
    { angle: 96, length: 110, droop: 10, leaflet: 26 },
  ],
  coconuts: [
    { x: 252, y: 410, r: 9 },
    { x: 270, y: 414, r: 8 },
  ],
};

export const PALMS = {
  tall: buildPalm(TALL),
  short: buildPalm(SHORT),
} as const;

export type PalmVariant = keyof typeof PALMS;
