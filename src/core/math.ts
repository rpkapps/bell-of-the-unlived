import * as THREE from 'three';

export const TAU = Math.PI * 2;
export const DEG = Math.PI / 180;

export const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);
export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const invLerp = (a: number, b: number, v: number) => (b === a ? 0 : (v - a) / (b - a));
export const smoothstep = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
/** Frame-rate independent exponential smoothing. `rate` = 1/seconds to close ~63 %. */
export const damp = (a: number, b: number, rate: number, dt: number) => lerp(a, b, 1 - Math.exp(-rate * dt));
/** Wrap an angle to (-PI, PI]. */
export const wrapAngle = (a: number) => {
  a = (a + Math.PI) % TAU;
  if (a < 0) a += TAU;
  return a - Math.PI;
};
export const angleDiff = (from: number, to: number) => wrapAngle(to - from);
export const dampAngle = (a: number, b: number, rate: number, dt: number) => a + angleDiff(a, b) * (1 - Math.exp(-rate * dt));
/** Rotate `a` toward `b` by at most `maxStep` radians. */
export const approachAngle = (a: number, b: number, maxStep: number) => {
  const d = angleDiff(a, b);
  return Math.abs(d) <= maxStep ? b : a + Math.sign(d) * maxStep;
};
export const approach = (a: number, b: number, maxStep: number) => (Math.abs(b - a) <= maxStep ? b : a + Math.sign(b - a) * maxStep);
/** Yaw for a direction on the XZ plane, where yaw 0 faces +Z. */
export const yawOf = (x: number, z: number) => Math.atan2(x, z);
export const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
export const easeOut = (t: number) => 1 - (1 - t) * (1 - t);
export const easeIn = (t: number) => t * t;

export const _v1 = new THREE.Vector3();
export const _v2 = new THREE.Vector3();
export const _v3 = new THREE.Vector3();
export const _q1 = new THREE.Quaternion();
export const _m1 = new THREE.Matrix4();

/** Closest distance between segments p1-q1 and p2-q2. Writes closest points to c1/c2 when given. */
export function segmentSegmentDistSq(
  p1: THREE.Vector3, q1: THREE.Vector3, p2: THREE.Vector3, q2: THREE.Vector3,
  c1?: THREE.Vector3, c2?: THREE.Vector3,
): number {
  const d1x = q1.x - p1.x, d1y = q1.y - p1.y, d1z = q1.z - p1.z;
  const d2x = q2.x - p2.x, d2y = q2.y - p2.y, d2z = q2.z - p2.z;
  const rx = p1.x - p2.x, ry = p1.y - p2.y, rz = p1.z - p2.z;
  const a = d1x * d1x + d1y * d1y + d1z * d1z;
  const e = d2x * d2x + d2y * d2y + d2z * d2z;
  const f = d2x * rx + d2y * ry + d2z * rz;
  let s = 0, t = 0;
  if (a <= 1e-9 && e <= 1e-9) { s = t = 0; }
  else if (a <= 1e-9) { s = 0; t = clamp01(f / e); }
  else {
    const c = d1x * rx + d1y * ry + d1z * rz;
    if (e <= 1e-9) { t = 0; s = clamp01(-c / a); }
    else {
      const b = d1x * d2x + d1y * d2y + d1z * d2z;
      const denom = a * e - b * b;
      s = denom !== 0 ? clamp01((b * f - c * e) / denom) : 0;
      t = (b * s + f) / e;
      if (t < 0) { t = 0; s = clamp01(-c / a); }
      else if (t > 1) { t = 1; s = clamp01((b - c) / a); }
    }
  }
  const x1 = p1.x + d1x * s, y1 = p1.y + d1y * s, z1 = p1.z + d1z * s;
  const x2 = p2.x + d2x * t, y2 = p2.y + d2y * t, z2 = p2.z + d2z * t;
  if (c1) c1.set(x1, y1, z1);
  if (c2) c2.set(x2, y2, z2);
  const dx = x1 - x2, dy = y1 - y2, dz = z1 - z2;
  return dx * dx + dy * dy + dz * dz;
}
