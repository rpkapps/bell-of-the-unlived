/**
 * Heraldry vector shapes — the single source of truth for every charge in the game.
 *
 * Self-contained on purpose (NO imports): the UI uses `heraldrySvg()` for icons, the renderer
 * (`heraldry.ts`) turns the same path data into Path2D for canvas textures.
 *
 * Every shape is ONE path drawn with `fill-rule="evenodd"`: nested sub-paths alternate between
 * solid and cut-out (e.g. the arch body, its opening, and the bell hanging inside the opening).
 * Coordinates live in the shape's own viewBox (width 100; height varies with the shape).
 *
 * Shapes follow the reference sheets:
 *   concept-art/heraldry/royal-arms-user-reference.png     → 'royal'
 *   concept-art/heraldry/heraldry-system-user-reference.png → 'household' (top-left), 'crown',
 *     'army' (castle + sword), 'academy' (diamond + slit eye), 'cathedral' (gothic arch + bell),
 *     'treasury' (keyhole plate).
 */

export type HeraldryKind = 'royal' | 'household' | 'crown' | 'army' | 'academy' | 'cathedral' | 'treasury';
export const HERALDRY_KINDS: readonly HeraldryKind[] = ['royal', 'household', 'crown', 'army', 'academy', 'cathedral', 'treasury'];

export interface HeraldryShape {
  /** [minX, minY, width, height] */
  viewBox: [number, number, number, number];
  /** SVG path data; fill with the even-odd rule. */
  d: string;
}

type Pt = [number, number];

/** Round to 2 decimals so the path strings stay compact. */
const r2 = (v: number) => Math.round(v * 100) / 100;

/** Tiny path-string builder. */
class Path {
  private s: string[] = [];
  M(x: number, y: number) { this.s.push(`M${r2(x)} ${r2(y)}`); return this; }
  L(x: number, y: number) { this.s.push(`L${r2(x)} ${r2(y)}`); return this; }
  Q(cx: number, cy: number, x: number, y: number) { this.s.push(`Q${r2(cx)} ${r2(cy)} ${r2(x)} ${r2(y)}`); return this; }
  C(c1x: number, c1y: number, c2x: number, c2y: number, x: number, y: number) {
    this.s.push(`C${r2(c1x)} ${r2(c1y)} ${r2(c2x)} ${r2(c2y)} ${r2(x)} ${r2(y)}`); return this;
  }
  A(rx: number, ry: number, large: 0 | 1, sweep: 0 | 1, x: number, y: number) {
    this.s.push(`A${r2(rx)} ${r2(ry)} 0 ${large} ${sweep} ${r2(x)} ${r2(y)}`); return this;
  }
  Z() { this.s.push('Z'); return this; }
  poly(pts: Pt[]) { pts.forEach((p, i) => (i === 0 ? this.M(p[0], p[1]) : this.L(p[0], p[1]))); return this.Z(); }
  rect(x: number, y: number, w: number, h: number) { return this.poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]]); }
  circle(cx: number, cy: number, r: number) {
    return this.M(cx - r, cy).A(r, r, 1, 0, cx + r, cy).A(r, r, 1, 0, cx - r, cy).Z();
  }
  ellipse(cx: number, cy: number, rx: number, ry: number) {
    return this.M(cx - rx, cy).A(rx, ry, 1, 0, cx + rx, cy).A(rx, ry, 1, 0, cx - rx, cy).Z();
  }
  toString() { return this.s.join(''); }
}

/** Mirror a left-half outline (listed top→bottom or any order) about x = cx and append it reversed. */
function mirrored(left: Pt[], cx = 50): Pt[] {
  const right = left.slice().reverse().map(([x, y]) => [2 * cx - x, y] as Pt);
  return left.concat(right);
}

/**
 * Arrow-head crown point: tip, two barbs and a neck, oriented along `dir` (from base toward tip).
 * Returns the outline from the left neck, over the tip, to the right neck.
 */
function arrowPoint(tip: Pt, dir: Pt, barbBack: number, barbHalf: number, neckBack: number, neckHalf: number): Pt[] {
  const len = Math.hypot(dir[0], dir[1]);
  const d: Pt = [dir[0] / len, dir[1] / len];
  const perp: Pt = [-d[1], d[0]]; // points to the right of the tip direction
  const at = (back: number, side: number): Pt => [tip[0] - d[0] * back + perp[0] * side, tip[1] - d[1] * back + perp[1] * side];
  return [at(neckBack, -neckHalf), at(barbBack, -barbHalf), tip, at(barbBack, barbHalf), at(neckBack, neckHalf)];
}

// ---------------------------------------------------------------------------------------------
// ROYAL ARMS — five-pointed barbed crown over an arched bar, a horseshoe arch holding a bell,
// a small clapper lozenge and a base bar (royal-arms-user-reference.png).
// ---------------------------------------------------------------------------------------------
function royal(): HeraldryShape {
  const p = new Path();
  // Crown: left half from bottom-left corner up and over the points, ending at the centre tip.
  const outer = arrowPoint([0.5, 26], [-12, -19], 9, 5, 11.5, 2.4);
  const inner = arrowPoint([25, 19.5], [-4, -20], 8, 4.6, 10.5, 2.1);
  const leftHalf: Pt[] = [
    [13.5, 68.5],
    ...outer,
    [20.5, 46.5], // notch between outer and inner point
    ...inner,
    [38.5, 41.5], // notch between inner and centre point
    [46.4, 22], [43, 17.5], // centre point neck + barb
  ];
  const crown = mirrored(leftHalf);
  crown.splice(leftHalf.length, 0, [50, 0]); // centre tip between the two centre barbs
  // outline: bottom edge is an arch (higher in the middle)
  p.M(crown[0][0], crown[0][1]);
  for (let i = 1; i < crown.length; i++) p.L(crown[i][0], crown[i][1]);
  p.Q(50, 53.5, 13.5, 68.5).Z();

  // Arched bar under the crown
  p.M(13.5, 75.6).Q(50, 69, 86.5, 75.6).L(86.5, 86.6).Q(50, 82, 13.5, 86.6).Z();

  // Horseshoe arch: outer semicircle r=43 centred (50,137.6); inner opening r=28; flared feet.
  const cy = 137.6, ro = 43, ri = 28, foot = 163.3;
  p.M(50 - ro - 4.5, foot).Q(50 - ro, foot - 3, 50 - ro, foot - 11)
    .L(50 - ro, cy).A(ro, ro, 0, 1, 50 + ro, cy)
    .L(50 + ro, foot - 11).Q(50 + ro, foot - 3, 50 + ro + 4.5, foot)
    .L(50 + ri, foot).L(50 + ri, cy).A(ri, ri, 0, 0, 50 - ri, cy)
    .L(50 - ri, foot).Z();
  // Lozenges cut into each leg at the spring line
  const lz = (x: number) => p.poly([[x, cy - 5], [x + 2.3, cy - 0.5], [x, cy + 4], [x - 2.3, cy - 0.5]]);
  lz(50 - (ro + ri) / 2); lz(50 + (ro + ri) / 2);

  // Bell: tall pointed finial, rounded shoulders, flaring waist, flat lip with small points.
  p.M(50, 110.2).L(53.3, 117.6).L(52.3, 120.7)
    .C(56.8, 120.9, 59.6, 122.2, 59.8, 127.5)
    .C(60.1, 138.5, 61.6, 147.5, 65.6, 153.4)
    .C(67.4, 156.2, 69.2, 157.8, 70.9, 158.9)
    .L(71.6, 160.9).L(69.8, 163.3)
    .L(30.2, 163.3).L(28.4, 160.9).L(29.1, 158.9)
    .C(30.8, 157.8, 32.6, 156.2, 34.4, 153.4)
    .C(38.4, 147.5, 39.9, 138.5, 40.2, 127.5)
    .C(40.4, 122.2, 43.2, 120.9, 47.7, 120.7)
    .L(46.7, 117.6).Z();
  // Clapper lozenge below the lip
  p.poly([[50, 164.9], [52.6, 167.3], [50, 169.7], [47.4, 167.3]]);
  // Base bar
  p.rect(2.6, 172, 94.8, 12);
  return { viewBox: [0, 0, 100, 184], d: p.toString() };
}

// ---------------------------------------------------------------------------------------------
// CROWN (heraldry sheet, top centre): three points, outer ones leaning out, barbed notches.
// ---------------------------------------------------------------------------------------------
function crownOutline(ox: number, oy: number, sx: number, sy: number): Pt[] {
  // Designed in a 100 x 70 box (see crownShape) then placed with offset/scale.
  const left: Pt[] = [
    [14.8, 67.2],     // bottom-left (slightly rounded by the caller)
    [4.3, 7.9],       // outer tip
    [20.2, 29.4],     // barb (juts into notch)
    [18.4, 35.4],     // under the barb
    [30.2, 47.2],     // V bottom
    [41.6, 34.3],     // under the centre point's barb
    [37.8, 29.2],     // centre point barb
  ];
  const all = mirrored(left);
  all.splice(left.length, 0, [50, 3.1]); // centre tip
  return all.map(([x, y]) => [ox + x * sx, oy + y * sy] as Pt);
}

function crownShape(): HeraldryShape {
  const p = new Path();
  const pts = crownOutline(0, 0, 1, 1);
  // bottom edge: slight upward curve with rounded corners
  p.M(pts[0][0], pts[0][1] - 1.2);
  for (let i = 1; i < pts.length - 1; i++) p.L(pts[i][0], pts[i][1]);
  const last = pts[pts.length - 1];
  p.L(last[0], last[1] - 1.2).Q(last[0] - 0.6, last[1] + 0.3, last[0] - 3, last[1] + 0.3)
    .Q(50, 66.2, pts[0][0] + 3, pts[0][1] + 0.3).Q(pts[0][0] + 0.6, pts[0][1] + 0.3, pts[0][0], pts[0][1] - 1.2).Z();
  return { viewBox: [0, 0, 100, 70], d: p.toString() };
}

// ---------------------------------------------------------------------------------------------
// HOUSEHOLD (sheet top-left): gateway with cornice and flared pillars, crown set into the
// lintel, bell hung from a yoke inside a round-headed opening, clapper below.
// ---------------------------------------------------------------------------------------------
function household(): HeraldryShape {
  const p = new Path();
  const top = 22, corniceUnder = 27.6, pilL = 10.6, pilR = 89.4, foot = 106;
  const openL = 22, openR = 78, openCy = 67.3, openR2 = (openR - openL) / 2;
  // Crown (placed inside a notch cut into the lintel)
  const cw = 0.36, cx0 = 50 - 50 * cw, cy0 = 2.4;
  const crown = crownOutline(cx0, cy0, cw, 0.42);
  const notchGap = 1.3;
  // Gateway outline with the crown notch
  const nL = crown[0][0] - notchGap, nR = crown[crown.length - 1][0] + notchGap, nB = crown[0][1] + notchGap;
  p.M(1.5, top)
    .L(nL - 2.4, top).L(nL, nB).L(nR, nB).L(nR + 2.4, top)
    .L(98.5, top)
    .Q(97.5, top + 3.2, 93, corniceUnder).L(pilR, corniceUnder)
    .L(pilR, foot - 12).Q(pilR, foot - 2, pilR + 7.5, foot)
    .L(openR, foot).L(openR, openCy).A(openR2, openR2, 0, 0, openL, openCy).L(openL, foot)
    .L(pilL - 7.5, foot).Q(pilL, foot - 2, pilL, foot - 12)
    .L(pilL, corniceUnder).L(7, corniceUnder).Q(2.5, top + 3.2, 1.5, top).Z();
  // Crown (solid, separated from the lintel by the notch gap)
  p.M(crown[0][0], crown[0][1]);
  for (let i = 1; i < crown.length; i++) p.L(crown[i][0], crown[i][1]);
  p.Z();
  // Grooves under the cornice at the pillar heads (thin cuts)
  p.rect(pilL - 0.2, corniceUnder + 0.2, 7.2, 0.9).rect(pilR - 7, corniceUnder + 0.2, 7.2, 0.9);
  // Yoke (headstock) across the opening, with small drop tabs
  const yT = 48.4, yB = 51.6;
  p.poly([[29.5, yT], [70.5, yT], [70.5, yB + 1.6], [68.2, yB + 1.6], [67.6, yB], [32.4, yB], [31.8, yB + 1.6], [29.5, yB + 1.6]]);
  // Cannon (hanging loop) with an oval eye — pointed top
  p.M(46.4, 57.8).L(46.4, 46.6).L(48.2, 44).L(50, 43.2).L(51.8, 44).L(53.6, 46.6).L(53.6, 57.8).Z();
  p.ellipse(50, 50, 1.6, 3.1);
  // Bell body
  p.M(44.6, 58.4)
    .C(40.8, 58.8, 39.6, 61.5, 39.4, 66)
    .C(39.2, 74.5, 38.6, 81, 35.4, 85.6)
    .C(33.6, 88.1, 31.4, 89.6, 29.5, 90.6).L(29.5, 91.4)
    .L(70.5, 91.4).L(70.5, 90.6)
    .C(68.6, 89.6, 66.4, 88.1, 64.6, 85.6)
    .C(61.4, 81, 60.8, 74.5, 60.6, 66)
    .C(60.4, 61.5, 59.2, 58.8, 55.4, 58.4).Z();
  // Clapper: dome with a flat top gap
  p.M(46.2, 93.4).L(53.8, 93.4).Q(53.8, 97.6, 50, 97.8).Q(46.2, 97.6, 46.2, 93.4).Z();
  return { viewBox: [0, 0, 100, 107], d: p.toString() };
}

// ---------------------------------------------------------------------------------------------
// ARMY (sheet top-right): two crenellated towers with slits, a crenellated gatehouse whose
// round-headed gate frames an upright sword; tower bases cut on a slant (shield-like).
// ---------------------------------------------------------------------------------------------
function army(): HeraldryShape {
  const p = new Path();
  // Crenellated cap: merlons along the top edge.
  const cap = (x0: number, x1: number, y0: number, y1: number, merlons: number, gapDepth: number) => {
    const w = x1 - x0, n = merlons * 2 - 1, seg = w / n;
    const pts: Pt[] = [[x0, y1], [x0, y0]];
    for (let i = 0; i < n; i++) {
      const xa = x0 + i * seg, xb = xa + seg;
      if (i % 2 === 0) { pts.push([xa, y0], [xb, y0]); }
      else { pts.push([xa, y0 + gapDepth], [xb, y0 + gapDepth]); }
    }
    pts.push([x1, y0], [x1, y1]);
    // dedupe consecutive identical points
    const out: Pt[] = [];
    for (const q of pts) { const l = out[out.length - 1]; if (!l || l[0] !== q[0] || l[1] !== q[1]) out.push(q); }
    p.poly(out);
  };
  // Tower caps and corbel bands
  cap(5, 36.4, 2.9, 13.6, 3, 4.3);
  cap(63.6, 95, 2.9, 13.6, 3, 4.3);
  const band = (x0: number, x1: number) => p.M(x0, 15).L(x1, 15).Q(x1 - 0.2, 17.6, x1 - 1.6, 18).L(x0 + 1.6, 18).Q(x0 + 0.2, 17.6, x0, 15).Z();
  band(7, 34.4); band(65.6, 93);
  // Tower bodies: slanted bottoms (lower toward the gate), window slits cut out
  p.poly([[9.3, 20.7], [31.4, 20.7], [31.4, 88], [9.3, 78.5]]);
  p.poly([[68.6, 20.7], [90.7, 20.7], [90.7, 78.5], [68.6, 88]]);
  p.rect(18.6, 29.3, 4.3, 12.8).rect(77.1, 29.3, 4.3, 12.8);
  // Gatehouse cap (4 merlons)
  cap(34.3, 65.7, 21.4, 29.3, 4, 3.4);
  // Gate body: thin frame with a round-headed opening
  const gT = 31.4, gB = 88, oL = 38.2, oR = 61.8, oCy = 44;
  p.M(34.3, gB).L(34.3, gT).L(65.7, gT).L(65.7, gB).L(oR, gB).L(oR, oCy)
    .A((oR - oL) / 2, (oR - oL) / 2, 0, 0, oL, oCy).L(oL, gB).Z();
  // Sword (inside the opening → solid again)
  p.M(50, 38).C(51.7, 45, 53, 55, 52.6, 64.5).C(52.3, 68, 51.4, 70.2, 51.2, 72.4)
    .L(57.6, 72.4).L(58.6, 73.7).L(57.6, 75).L(51.2, 75)
    .L(51.2, 84.2).L(52.4, 86.2).L(50, 89.4).L(47.6, 86.2).L(48.8, 84.2).L(48.8, 75)
    .L(42.4, 75).L(41.4, 73.7).L(42.4, 72.4).L(48.8, 72.4)
    .C(48.6, 70.2, 47.7, 68, 47.4, 64.5).C(47, 55, 48.3, 45, 50, 38).Z();
  // Grip ring cut
  p.rect(48.8, 80.2, 2.4, 0.8);
  return { viewBox: [0, 0, 100, 91], d: p.toString() };
}

// ---------------------------------------------------------------------------------------------
// ACADEMY (sheet bottom-left): double-bordered lozenge split by a vertical slit eye.
// ---------------------------------------------------------------------------------------------
function academy(): HeraldryShape {
  const p = new Path();
  const cx = 50, cy = 58, a = 45, b = 53;
  const diamond = (k: number) => p.poly([[cx, cy - b * k], [cx + a * k, cy], [cx, cy + b * k], [cx - a * k, cy]]);
  const kOf = (d: number) => 1 - d * Math.sqrt(1 / (a * a) + 1 / (b * b));
  diamond(1);            // outer border (solid)
  diamond(kOf(3.4));     // gap (cut)
  const kIn = kOf(5.9);
  diamond(kIn);          // inner field (solid)
  // Slit eye — a vesica from the inner diamond's top point to its bottom point
  const t = cy - b * kIn + 0.6, bt = cy + b * kIn - 0.6, w = 4.3;
  p.M(cx, t).C(cx + w * 1.25, cy - 22, cx + w * 1.25, cy + 22, cx, bt).C(cx - w * 1.25, cy + 22, cx - w * 1.25, cy - 22, cx, t).Z();
  return { viewBox: [0, 0, 100, 116], d: p.toString() };
}

// ---------------------------------------------------------------------------------------------
// CATHEDRAL (sheet bottom-centre): corniced portal, gothic pointed opening with an inner
// moulding line, bell with a ring top and clapper.
// ---------------------------------------------------------------------------------------------
function pointedArch(p: Path, l: number, r: number, spring: number, apexY: number, bottom: number, inset: number, reverse: boolean) {
  // Equilateral-ish two-centred arch through (l,spring), (mid,apexY), (r,spring); inset shrinks radius.
  const mid = (l + r) / 2, half = (r - l) / 2, h = spring - apexY;
  // centre offset c (from mid, on the far side) and radius R: (half + c)^2 = c^2 + h^2
  const c = (h * h - half * half) / (2 * half), R = half + c;
  const Ri = R - inset;
  const li = l + inset, ri = r - inset;
  const apexI = spring - Math.sqrt(Math.max(0, Ri * Ri - c * c));
  if (!reverse) {
    p.M(li, bottom).L(li, spring).A(Ri, Ri, 0, 1, mid, apexI).A(Ri, Ri, 0, 1, ri, spring).L(ri, bottom).Z();
  } else {
    p.M(ri, bottom).L(ri, spring).A(Ri, Ri, 0, 0, mid, apexI).A(Ri, Ri, 0, 0, li, spring).L(li, bottom).Z();
  }
}

function cathedral(): HeraldryShape {
  const p = new Path();
  const top = 2.2, underC = 8.4, pilL = 9.6, pilR = 90.4, foot = 88.2;
  // Portal silhouette (cornice + pillars with flared feet)
  p.M(1.2, top).L(98.8, top).Q(97.8, top + 3.8, 93.6, underC).L(pilR, underC)
    .L(pilR, foot - 9).Q(pilR, foot - 1.5, pilR + 6.8, foot).L(pilL - 6.8, foot).Q(pilL, foot - 1.5, pilL, foot - 9)
    .L(pilL, underC).L(6.4, underC).Q(2.2, top + 3.8, 1.2, top).Z();
  // Grooves under the cornice (thin cuts, interrupted as on the reference)
  p.rect(9.2, 8.6, 8.4, 0.9).rect(32, 8.6, 32.5, 0.9).rect(79, 8.6, 10, 0.9);
  // Gothic opening (cut), inner moulding (solid), inner void (cut)
  const l = 23.5, r = 76.5, spring = 44, apex = 14.7, bottom = 86.2;
  pointedArch(p, l, r, spring, apex, foot, 0, false);
  pointedArch(p, l, r, spring, apex, bottom, 1.9, true);
  pointedArch(p, l, r, spring, apex, bottom, 3.5, false);
  // Bell with a ring top
  p.circle(50, 39.5, 2.6);
  p.circle(50, 39.5, 1.05);
  p.M(47.4, 43.2)
    .C(43.4, 43.8, 42.3, 46.6, 42.1, 51)
    .C(41.9, 58.2, 41.2, 63.8, 38.4, 67.4)
    .C(37, 69, 35.6, 69.9, 34.6, 70.3).L(34.6, 71.2)
    .L(65.4, 71.2).L(65.4, 70.3)
    .C(64.4, 69.9, 63, 69, 61.6, 67.4)
    .C(58.8, 63.8, 58.1, 58.2, 57.9, 51)
    .C(57.7, 46.6, 56.6, 43.8, 52.6, 43.2)
    .L(51.8, 42.1).L(48.2, 42.1).Z();
  p.M(47.2, 73).L(52.8, 73).Q(52.8, 76.6, 50, 76.8).Q(47.2, 76.6, 47.2, 73).Z();
  return { viewBox: [0, 0, 100, 91], d: p.toString() };
}

// ---------------------------------------------------------------------------------------------
// TREASURY (sheet bottom-right): rough-edged plate with bracket corners, riveted frame line
// and a keyhole.
// ---------------------------------------------------------------------------------------------
function treasury(): HeraldryShape {
  const p = new Path();
  // Deterministic wobble for the plate's worn edge.
  let s = 1234567;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const edge: Pt[] = [];
  const side = (a: Pt, b: Pt, n: number, amp: number) => {
    for (let i = 0; i < n; i++) {
      const t = i / n;
      const x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t;
      const nx = -(b[1] - a[1]), ny = b[0] - a[0], nl = Math.hypot(nx, ny);
      const j = (rnd() - 0.5) * amp * (i === 0 ? 0 : 1);
      edge.push([x + (nx / nl) * j, y + (ny / nl) * j]);
    }
  };
  // Corner "ears": the plate bulges diagonally at each corner.
  const c: Pt[] = [
    [3.2, 3.6], [11, 5.2], [89, 5.2], [96.8, 3.6], [95.2, 11], [95.2, 89], [96.8, 96.4], [89, 94.8],
    [11, 94.8], [3.2, 96.4], [4.8, 89], [4.8, 11],
  ];
  for (let i = 0; i < c.length; i++) side(c[i], c[(i + 1) % c.length], i % 3 === 1 ? 14 : 3, i % 3 === 1 ? 1.1 : 0.5);
  p.poly(edge);
  // Frame line between corner rivets (cuts), rivets (cuts)
  const x0 = 15.2, x1 = 85.2, y0 = 13.4, y1 = 87.8, lw = 1.5, rr = 2.5;
  p.rect(x0 + rr, y0 - lw / 2, x1 - x0 - 2 * rr, lw);
  p.rect(x0 + rr, y1 - lw / 2, x1 - x0 - 2 * rr, lw);
  p.rect(x0 - lw / 2, y0 + rr, lw, y1 - y0 - 2 * rr);
  p.rect(x1 - lw / 2, y0 + rr, lw, y1 - y0 - 2 * rr);
  p.circle(x0, y0, rr).circle(x1, y0, rr).circle(x0, y1, rr).circle(x1, y1, rr);
  // Keyhole
  const kx = 50, ky = 36.8, kr = 9.4;
  const a = Math.asin(4.4 / kr);
  p.M(kx - 4.4, ky + kr * Math.cos(a)).A(kr, kr, 1, 1, kx + 4.4, ky + kr * Math.cos(a))
    .L(59.2, 73.2).L(40.8, 73.2).Z();
  return { viewBox: [0, 0, 100, 100], d: p.toString() };
}

const BUILDERS: Record<HeraldryKind, () => HeraldryShape> = {
  royal, household, crown: crownShape, army, academy, cathedral, treasury,
};
const cache = new Map<HeraldryKind, HeraldryShape>();

/** Path data + viewBox for a charge (cached). Fill with the even-odd rule. */
export function heraldryShape(kind: HeraldryKind): HeraldryShape {
  let s = cache.get(kind);
  if (!s) { s = BUILDERS[kind](); cache.set(kind, s); }
  return s;
}

/**
 * A complete, standalone SVG string for a charge. `color` defaults to `currentColor` so the
 * icon inherits the CSS text colour. Safe to inline in HTML or use as a data URI.
 */
export function heraldrySvg(kind: HeraldryKind, opts: { color?: string; title?: string } = {}): string {
  const s = heraldryShape(kind);
  const title = opts.title ? `<title>${opts.title.replace(/[<&>]/g, '')}</title>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${s.viewBox.join(' ')}" role="img">${title}` +
    `<path fill="${opts.color ?? 'currentColor'}" fill-rule="evenodd" d="${s.d}"/></svg>`;
}
