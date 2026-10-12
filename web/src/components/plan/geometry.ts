export type Point = { x: number; y: number };

const METRES_PER_UNIT = 0.04;

export const length = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y);

export const toPath = (points: Point[]) =>
  points.map((p, i) => `${i ? "L" : "M"}${p.x} ${p.y}`).join(" ") + " Z";

export const centroid = (points: Point[]): Point => ({
  x: points.reduce((sum, p) => sum + p.x, 0) / points.length,
  y: points.reduce((sum, p) => sum + p.y, 0) / points.length,
});

export function edges(points: Point[]) {
  return points.map((from, i) => ({ from, to: points[(i + 1) % points.length] }));
}

export function bearing(from: Point, to: Point) {
  const degrees = (Math.atan2(to.x - from.x, from.y - to.y) * 180) / Math.PI;
  const whole = (degrees + 360) % 360;
  const minutes = Math.round((whole % 1) * 60);
  return `${Math.floor(whole)}°${String(minutes).padStart(2, "0")}′`;
}

export const distance = (from: Point, to: Point) =>
  `${(length(from, to) * METRES_PER_UNIT).toFixed(2)} m`;

export function edgeLabelPosition(from: Point, to: Point, center: Point, offset = 14) {
  const mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
  const len = length(from, to);
  let normal = { x: -(to.y - from.y) / len, y: (to.x - from.x) / len };
  if ((mid.x - center.x) * normal.x + (mid.y - center.y) * normal.y < 0) {
    normal = { x: -normal.x, y: -normal.y };
  }
  let angle = (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;
  if (angle > 90) angle -= 180;
  if (angle < -90) angle += 180;
  return { x: mid.x + normal.x * offset, y: mid.y + normal.y * offset, angle, normal };
}

export function directionFrom(center: Point, point: Point): Point {
  const len = length(center, point) || 1;
  return { x: (point.x - center.x) / len, y: (point.y - center.y) / len };
}

export function traverseFractions(points: Point[]) {
  const legs = edges(points).map(({ from, to }) => length(from, to));
  const total = legs.reduce((sum, leg) => sum + leg, 0);
  let travelled = 0;
  return points.map((_, i) => {
    const fraction = travelled / total;
    travelled += legs[i];
    return fraction;
  });
}
