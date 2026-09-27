/** Listener math shared by panning, distance culling and caption direction. */

export interface Vec3 { x: number; y: number; z: number }
export type CaptionDir = 'left' | 'right' | 'ahead' | 'behind';

/** Plain-number copy of the listener basis (camera). */
export class ListenerState {
  pos: Vec3 = { x: 0, y: 0, z: 0 };
  fwd: Vec3 = { x: 0, y: 0, z: -1 };
  up: Vec3 = { x: 0, y: 1, z: 0 };

  set(pos: Vec3, fwd: Vec3, up: Vec3): void {
    this.pos = { x: pos.x, y: pos.y, z: pos.z };
    const fl = Math.hypot(fwd.x, fwd.y, fwd.z) || 1;
    this.fwd = { x: fwd.x / fl, y: fwd.y / fl, z: fwd.z / fl };
    const ul = Math.hypot(up.x, up.y, up.z) || 1;
    this.up = { x: up.x / ul, y: up.y / ul, z: up.z / ul };
  }

  distance(p: Vec3): number {
    return Math.hypot(p.x - this.pos.x, p.y - this.pos.y, p.z - this.pos.z);
  }

  /**
   * Coarse direction of `p` relative to the listener's facing, on the listener's horizontal
   * plane: within ±45° = ahead, beyond ±135° = behind, otherwise left/right.
   */
  direction(p: Vec3): CaptionDir {
    const d = { x: p.x - this.pos.x, y: p.y - this.pos.y, z: p.z - this.pos.z };
    const f = this.fwd;
    const u = this.up;
    // right = forward × up
    const r = { x: f.y * u.z - f.z * u.y, y: f.z * u.x - f.x * u.z, z: f.x * u.y - f.y * u.x };
    const x = d.x * r.x + d.y * r.y + d.z * r.z;
    const z = d.x * f.x + d.y * f.y + d.z * f.z;
    if (Math.abs(x) < 1e-4 && Math.abs(z) < 1e-4) return 'ahead';
    const ang = Math.atan2(x, z) * (180 / Math.PI);
    if (Math.abs(ang) <= 45) return 'ahead';
    if (Math.abs(ang) >= 135) return 'behind';
    return ang > 0 ? 'right' : 'left';
  }
}

/** WebAudio 'inverse' distance model gain (matches PannerNode). */
export function inverseGain(d: number, ref: number, rolloff: number): number {
  return ref / (ref + rolloff * (Math.max(d, ref) - ref));
}
