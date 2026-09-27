/**
 * Wood family: oak timber (grain along +U), planks, charred timber, burnt thatch, and the
 * Household Shield face (black-painted vertical boards with the worn gilt royal arms, from uMask).
 */
export const WOOD_KINDS = { timber: 0, planks: 1, burnt: 2, thatch: 3, shield: 4 } as const;

export const GLSL_WOOD = /* glsl */ `
/** Oak grain along +U. Returns the latewood mask; writes fibre streaks. */
float oak(vec2 uv, float rings, float seed, out float fibre) {
  float warp = fbm(uv, vec2(1.0, 3.0), 4, seed);
  float y = uv.y * rings + warp * 2.6 + 0.35 * fbm(uv, vec2(5.0, 20.0), 2, seed + 1.0);
  float ring = fract(y);
  fibre = vfbm(uv, vec2(3.0, 190.0), 3, seed + 2.0);
  // latewood: dense dark band at the end of each growth ring, porous earlywood before it
  float lw = smoothstep(0.5, 0.9, ring) * (1.0 - smoothstep(0.93, 1.0, ring));
  return lw;
}
/** Oak medullary ray flecks (short, along the grain). */
float rays(vec2 uv, float seed) {
  return smoothstep(0.78, 0.92, gnoise(uv * vec2(22.0, 70.0), vec2(22.0, 70.0), seed)) * 0.6;
}

// uP0 = (rings, cracks, weather, knots)  uP1 = (roughBase, _, _, _)
// uC0 earlywood, uC1 latewood, uC2 weathered grey, uC3 knot
S timber(vec2 uv) {
  float fibre;
  float lw = oak(uv, uP0.x, uSeed, fibre);
  vec4 kw = worley(uv, vec2(2.0, 4.0), 0.9, uSeed + 4.0);
  float knot = (1.0 - smoothstep(0.03, 0.14, kw.x)) * step(1.0 - uP0.w * 0.5, kw.z);
  float ck = ridged(uv, vec2(2.0, 16.0), 2, uSeed + 5.0);
  float crackZone = smoothstep(0.35, 0.6, fbm(uv, vec2(3.0, 4.0), 2, uSeed + 6.0));
  float crack = smoothstep(0.9, 0.975, ck) * crackZone * uP0.y;
  float rr = rays(uv, uSeed + 7.0);
  float h = 0.55 + 0.08 * lw * (0.4 + uP0.z) + 0.1 * (fibre - 0.5) - 0.5 * crack - 0.06 * knot;
  vec3 c = mix(uC0, uC1, lw * 0.85) * (0.78 + 0.44 * fibre);
  c = mix(c, c * 1.2, rr * (1.0 - uP0.z));
  c = mix(c, uC3, knot * 0.85);
  float g = uP0.z * smoothstep(0.25, 0.85, fbm1(uv, 3.0, 3, uSeed + 8.0) + fibre * 0.35);
  c = mix(c, uC2 * (0.75 + 0.5 * fibre), g);
  c *= 1.0 - 0.75 * crack;
  float rough = uP1.x + 0.12 * fibre + 0.15 * crack + 0.08 * g;
  return mk(c, h, rough, 0.0);
}

// uP0 = (boards per tile, gap, nails, wear)  uP1 = (rings, weather, cracks, roughBase)
S planks(vec2 uv) {
  float N = uP0.x;
  float fy = uv.y * N; float bi = floor(fy); float ly = fract(fy);
  float bid = imodf(bi, N);
  float rnd = hf(bid, uSeed);
  float jx = hf(bid, uSeed + 3.0);
  float lx = fract(uv.x - jx);
  float ey = min(ly, 1.0 - ly) / N;
  float ex = min(lx, 1.0 - lx);
  float e = min(ey, ex);
  float board = smoothstep(uP0.y * 0.5, uP0.y * 0.5 + 0.006, e);
  float bev = smoothstep(uP0.y * 0.5, uP0.y * 0.5 + 0.02, e);
  vec2 guv = uv + vec2(rnd * 0.37, bid * 0.173);
  float fibre;
  float lw = oak(guv, uP1.x, uSeed + bid, fibre);
  float ck = ridged(guv, vec2(2.0, 18.0), 2, uSeed + 5.0);
  float crack = smoothstep(0.92, 0.98, ck) * uP1.z;
  // nails near each board end, two across the board
  vec2 d1 = vec2(min(lx, 1.0 - lx) - 0.03, (ly - 0.28) / N);
  vec2 d2 = vec2(min(lx, 1.0 - lx) - 0.03, (ly - 0.72) / N);
  float nd = min(length(d1), length(d2));
  float nail = (1.0 - smoothstep(0.0045, 0.006, nd)) * uP0.z;
  float rustRing = (1.0 - smoothstep(0.006, 0.014, nd)) * uP0.z * (1.0 - nail);
  float wearM = uP0.w * smoothstep(0.35, 0.0, abs(ly - 0.5)) * (0.6 + 0.4 * fbm1(uv, 4.0, 3, uSeed + 9.0));
  float h = mix(0.05, 0.5 + 0.12 * bev + 0.07 * lw + 0.08 * (fibre - 0.5) + 0.04 * (rnd - 0.5) - 0.4 * crack - 0.03 * wearM, board);
  h = mix(h, 0.62, nail);
  vec3 c = mix(uC0, uC1, lw * 0.8) * (0.78 + 0.44 * fibre) * (0.85 + 0.3 * rnd);
  float g = uP1.y * smoothstep(0.2, 0.8, fbm1(guv, 3.0, 3, uSeed + 8.0) + fibre * 0.3);
  c = mix(c, uC2 * (0.75 + 0.5 * fibre), g);
  c = mix(c, c * 1.25 + 0.01, wearM);
  c *= 1.0 - 0.5 * (1.0 - bev) - 0.7 * crack;
  c = mix(c, vec3(0.05, 0.022, 0.01), rustRing * 0.7);
  c = mix(c, vec3(0.03, 0.028, 0.026), nail);
  c = mix(vec3(0.012, 0.009, 0.007), c, board);
  float rough = mix(0.95, uP1.w + 0.1 * fibre - 0.2 * wearM + 0.15 * crack, board);
  float metal = nail * 0.8;
  rough = mix(rough, 0.5, nail);
  return mk(c, h, rough, metal);
}

// uP0 = (cellsU, cellsV, remnants, _)  uC0 char, uC1 brown remnant, uC2 ash
S burnt(vec2 uv) {
  vec2 tp;
  vec3 v = voronoiEdge(uv, uP0.xy, 0.85, uSeed, tp);
  float fibre;
  float lw = oak(uv, 6.0, uSeed + 3.0, fibre);
  float det = fbm1(uv, 24.0, 3, uSeed + 1.0);
  float crack = 1.0 - smoothstep(0.0, 0.08, v.x + (det - 0.5) * 0.05);
  float block = sqrt(smoothstep(0.0, 0.3, v.x));
  float h = 0.25 + 0.5 * block + 0.06 * (fibre - 0.5) + 0.04 * lw - 0.2 * crack;
  float rem = smoothstep(0.62, 0.8, fbm1(uv, 5.0, 4, uSeed + 2.0)) * uP0.z;
  vec3 c = uC0 * (0.8 + 0.5 * fibre) * (0.85 + 0.3 * v.y);
  c = mix(c, uC1 * (0.7 + 0.6 * fibre), rem * (1.0 - crack));
  c = mix(c, uC2 * (0.7 + 0.6 * det), crack * 0.8);
  // char glints slightly: glossy tops, dusty cracks
  float rough = mix(0.55 + 0.2 * det, 0.95, crack);
  return mk(c, h, mix(rough, 0.85, rem), 0.0);
}

// uP0 = (courses, strands, burn, _)  uC0 char, uC1 straw, uC2 ash
S thatch(vec2 uv) {
  float rows = uP0.x;
  float fy = uv.y * rows; float course = floor(fy); float ly = fract(fy);
  float cid = imodf(course, rows);
  vec2 suv = vec2(uv.x + hf(cid, uSeed) * 0.31, uv.y);
  float strands = vfbm(suv, vec2(uP0.y, 4.0), 3, uSeed + 1.0);
  float coarse = fbm(suv, vec2(uP0.y * 0.125, 2.0), 3, uSeed + 2.0);
  float ragged = ly - 0.18 * vnoise(vec2(uv.x * uP0.y * 0.5, cid), vec2(uP0.y * 0.5, rows), uSeed + 3.0);
  float under = step(ragged, 0.0);
  float h = mix(0.3 + 0.45 * (1.0 - ly) + 0.25 * strands + 0.1 * coarse, 0.12 + 0.2 * strands, under);
  float burn = smoothstep(0.25, 0.65, fbm1(uv, 4.0, 4, uSeed + 4.0) + uP0.z * 0.4 - 0.2);
  vec3 c = mix(uC1 * (0.6 + 0.7 * strands), uC0 * (0.7 + 0.6 * strands), burn);
  float ash = smoothstep(0.7, 0.85, fbm1(uv, 12.0, 3, uSeed + 5.0)) * burn;
  c = mix(c, uC2, ash * 0.6);
  c *= mix(1.0, 0.35, under);
  return mk(c, h, 0.9 + 0.08 * strands, 0.0);
}

// Household Shield: uP0 = (boards, wear, goldLoss, _); uC0 wood, uC1 black paint, uC2 gold paint, uC3 scratch
S shield(vec2 uv) {
  float nb = uP0.x;
  float fx = uv.x * nb; float bi = floor(fx); float lx = fract(fx);
  float fibre;
  vec2 guv = vec2(uv.y, uv.x + hf(bi, uSeed) * 0.3);
  float lw = oak(guv, 9.0, uSeed + bi, fibre);
  float seam = 1.0 - smoothstep(0.0, 0.035, min(lx, 1.0 - lx));
  float det = fbm1(uv, 10.0, 5, uSeed + 1.0);
  // black paint worn back to the boards where the shield is handled and struck
  float wornN = fbm1(uv, 7.0, 5, uSeed + 2.0) + fibre * 0.25 + seam * 0.2;
  float worn = smoothstep(0.66, 0.8, wornN + uP0.y * 0.2 - 0.1);
  // gilt arms: flake loss + craquelure
  float mask = uHasMask > 0.5 ? texture(uMask, uv).a : 0.0;
  vec2 tp;
  vec3 fl = voronoiEdge(uv, vec2(46.0, 70.0), 1.0, uSeed + 5.0, tp);
  float lossField = fbm1(uv, 5.0, 4, uSeed + 6.0);
  float lost = step(fl.y, uP0.z * smoothstep(0.3, 0.75, lossField) + 0.1 * uP0.z);
  float craq = 1.0 - smoothstep(0.0, 0.06, fl.x);
  float gold = mask * (1.0 - lost) * (1.0 - craq * 0.85);
  float scr = scratches(uv, vec2(1.0, 1.0), vec2(-1.0, 1.0), 3.0, 60.0, 0.12, uSeed + 7.0)
            + scratches(uv, vec2(2.0, -1.0), vec2(1.0, 2.0), 2.0, 50.0, 0.1, uSeed + 8.0);
  scr = sat01(scr);
  vec3 wood = mix(uC0, uC0 * 0.55, lw) * (0.75 + 0.5 * fibre);
  vec3 paint = uC1 * (0.8 + 0.4 * det) * (0.92 + 0.16 * fibre);
  vec3 c = mix(paint, wood, worn);
  vec3 g = uC2 * (0.72 + 0.4 * det) * (0.9 + 0.2 * fibre);
  g *= 1.0 - 0.35 * smoothstep(0.55, 0.8, fbm1(uv, 20.0, 3, uSeed + 9.0));
  c = mix(c, g, gold);
  c = mix(c, uC3 * (0.7 + 0.5 * fibre), scr * 0.8);
  c *= 1.0 - 0.6 * seam;
  float h = 0.5 + 0.06 * (fibre - 0.5) + 0.03 * lw - 0.2 * seam + 0.03 * (1.0 - worn) + 0.035 * gold - 0.05 * scr;
  float rough = mix(0.62, 0.8, worn) + 0.08 * det;
  rough = mix(rough, 0.5, gold);
  return mk(c, h, rough, 0.0);
}

void main() {
  vec2 uv = vUv;
  S s;
  if (uKind == 0) s = timber(uv);
  else if (uKind == 1) s = planks(uv);
  else if (uKind == 2) s = burnt(uv);
  else if (uKind == 3) s = thatch(uv);
  else s = shield(uv);
  emit(s);
}
`;
