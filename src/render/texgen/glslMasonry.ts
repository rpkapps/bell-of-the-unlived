/**
 * Masonry & rock family: ashlar (wall/dark/fresh/trim), cobbles, flagstones, slate roofs,
 * rubble, cliff rock. All tileable. Colours arrive linear.
 */
export const MASONRY_KINDS = { ashlar: 0, cobble: 1, flagstone: 2, slate: 3, rubble: 4, cliff: 5 } as const;

export const GLSL_MASONRY = /* glsl */ `
// uP0 = (rows, cols, mortarWidth, chip)  uP1 = (erosion, moss, soot/grime, fresh 0|1)
// uC0 stone, uC1 stone alt, uC2 mortar, uC3 lichen
S ashlarStone(vec2 uv) {
  vec2 id, bs;
  vec4 A = ashlar(uv, uP0.x, uP0.y, 0.45, 0.55, uSeed, id, bs);
  float rnd = A.w, fresh = uP1.w, mw = uP0.z;
  float chipN = fbm1(uv, 12.0, 4, uSeed + 1.0);
  float chipF = fbm1(uv, 48.0, 3, uSeed + 2.0);
  // Chipped / eroded arrises: noise eats into the block from its joints.
  float e = A.z - uP0.w * (max(chipN - 0.42, 0.0) * 0.06 + chipF * 0.007);
  float bevel = mix(0.0025, 0.02, uP1.x);
  float blockM = smoothstep(mw * 0.5, mw * 0.5 + bevel, e);
  float shoulder = sqrt(blockM);
  vec2 buv = uv + vec2(rnd * 3.1, rnd * 1.7);
  float big = fbm1(buv, 4.0, 3, uSeed + 3.0);
  float med = fbm1(uv, 24.0, 4, uSeed + 4.0);
  float fine = gnoise(uv * 160.0, vec2(160.0), uSeed + 5.0);
  float pits = smoothstep(0.64, 0.82, gnoise(uv * 96.0, vec2(96.0), uSeed + 6.0)) * (1.0 - fresh);
  // Fresh stone: crisp tooled face with fine diagonal chisel striations.
  float tool = fresh * (0.5 + 0.5 * sin((A.x * bs.x * 0.8 + A.y * bs.y) * 1400.0 + med * 5.0));
  float bh = 0.64 + 0.14 * rnd + 0.2 * (big - 0.5) * (1.0 - 0.8 * fresh) + 0.07 * (med - 0.5) * (1.0 - 0.6 * fresh)
             + 0.012 * tool - 0.1 * pits + 0.015 * fine;
  float mh = 0.1 + 0.1 * chipF + 0.04 * med;
  float h = mix(mh, bh * (0.75 + 0.25 * shoulder), blockM);

  vec3 stone = mix(uC0, uC1, smoothstep(0.15, 0.85, rnd * 0.75 + big * 0.5 - 0.1));
  stone *= mix(0.78 + 0.44 * med, 0.94 + 0.12 * med, fresh);
  stone *= 0.93 + 0.14 * fine;
  float spk = smoothstep(0.74, 0.9, gnoise(uv * 230.0, vec2(230.0), uSeed + 8.0));
  stone *= 1.0 - 0.35 * spk;
  stone *= 1.0 - 0.35 * pits;
  // Old stone: grime creeps out of the joints; chipped arrises show paler fresh fracture.
  float nearJ = 1.0 - smoothstep(0.0, 0.03, e);
  stone *= 1.0 - 0.5 * nearJ * uP1.z * (1.0 - fresh);
  float chipped = (1.0 - smoothstep(mw * 0.6, mw * 0.6 + 0.004, e)) * smoothstep(mw * 0.6, mw * 0.6 + 0.004, A.z);
  stone = mix(stone, stone * 1.25 + 0.015, chipped * (1.0 - fresh) * blockM);
  // Lichen crusts on block faces.
  float lich = smoothstep(0.64, 0.7, fbm1(uv, 10.0, 4, uSeed + 9.0)) * uP1.y * (1.0 - fresh) * blockM;
  stone = mix(stone, uC3 * (0.75 + 0.5 * fine), lich * 0.75);
  // Mortar
  vec3 mort = uC2 * (0.7 + 0.6 * chipF);
  vec3 alb = mix(mort, stone, blockM);
  // Fresh masonry: damp halo wicking from the dark new mortar into the block edges.
  float damp = fresh * (1.0 - smoothstep(mw * 0.5, mw * 3.0, e));
  alb *= 1.0 - 0.28 * damp * blockM;
  // Moss: in joints and along lower block edges.
  float mossN = fbm1(uv, 16.0, 4, uSeed + 10.0);
  float moss = uP1.y * (1.0 - fresh) * smoothstep(0.5, 0.72, mossN + (1.0 - blockM) * 0.3 + (1.0 - A.y) * 0.12);
  vec3 mossC = mix(vec3(0.03, 0.045, 0.014), vec3(0.07, 0.085, 0.03), fine);
  alb = mix(alb, mossC, moss);
  float rough = mix(mix(0.95, 0.38, fresh), mix(0.84, 0.72, fresh) + 0.1 * med, blockM);
  rough = mix(rough, 0.5, damp * 0.5 * blockM);
  rough = mix(rough, 1.0, moss);
  h += moss * 0.06 * (1.0 - blockM) + lich * 0.01;
  return mk(alb, h, rough, 0.0);
}

// uP0 = (cellsX, cellsY, gap, polish)  uP1 = (_, moss, mud, _)
S cobble(vec2 uv) {
  vec2 tp;
  vec3 v = voronoiEdge(uv, uP0.xy, 0.8, uSeed, tp);
  float rnd = v.y;
  float gap = uP0.z;
  float det = fbm1(uv, 32.0, 4, uSeed + 1.0);
  float fine = gnoise(uv * 128.0, vec2(128.0), uSeed + 2.0);
  float stoneM = smoothstep(gap, gap + 0.05, v.x + (det - 0.5) * 0.06);
  float dome = sqrt(smoothstep(gap, gap + 0.4, v.x));
  float h = mix(0.08 + 0.1 * det, 0.5 + 0.38 * dome + 0.08 * (rnd - 0.5) + 0.05 * (det - 0.5) + 0.01 * fine, stoneM);
  vec3 st = mix(uC0, uC1, rnd) * (0.78 + 0.44 * det) * (0.93 + 0.14 * fine);
  st = mix(st, st * 1.18, dome * uP0.w * 0.6); // worn, polished crowns
  vec3 mud = uC2 * (0.7 + 0.5 * det);
  float moss = uP1.y * (1.0 - stoneM) * smoothstep(0.45, 0.65, fbm1(uv, 8.0, 3, uSeed + 4.0));
  vec3 alb = mix(mud, st, stoneM);
  alb = mix(alb, vec3(0.03, 0.042, 0.015), moss);
  float rough = mix(0.28 + 0.2 * det, 0.72 - 0.3 * dome * uP0.w + 0.08 * fine, stoneM);
  rough = mix(rough, 0.95, moss);
  return mk(alb, h, rough, 0.0);
}

// uP0 = (rows, cols, grout, crack)  uP1 = (dish/polish, moss, grime, _)
S flagstone(vec2 uv) {
  vec2 id, bs;
  vec4 A = ashlar(uv, uP0.x, uP0.y, 0.5, 0.8, uSeed, id, bs);
  float rnd = A.w;
  float det = fbm1(uv + rnd, 12.0, 5, uSeed + 1.0);
  float fine = gnoise(uv * 150.0, vec2(150.0), uSeed + 2.0);
  float e = A.z - 0.004 * fbm1(uv, 40.0, 2, uSeed + 3.0);
  float slab = smoothstep(uP0.z * 0.5, uP0.z * 0.5 + 0.004, e);
  vec2 tp;
  vec3 cr = voronoiEdge(uv, vec2(7.0), 1.0, uSeed + 4.0, tp);
  float crackZone = smoothstep(0.55, 0.7, fbm1(uv, 5.0, 3, uSeed + 5.0));
  float crack = (1.0 - smoothstep(0.0, 0.035, cr.x + 0.02 * det)) * crackZone * uP0.w * slab;
  vec2 c = min(A.xy, 1.0 - A.xy);
  float dish = smoothstep(0.0, 0.45, c.x) * smoothstep(0.0, 0.45, c.y);
  float h = mix(0.12, 0.62 + 0.12 * rnd + 0.12 * (det - 0.5) - 0.07 * dish * uP1.x + 0.012 * fine, slab) - crack * 0.25;
  vec3 st = mix(uC0, uC1, rnd) * (0.78 + 0.44 * det) * (0.93 + 0.14 * fine);
  st *= 1.0 - 0.4 * (1.0 - smoothstep(0.0, 0.03, e)) * uP1.z;
  st = mix(st, st * 1.12, dish * uP1.x);
  vec3 alb = mix(uC2 * (0.8 + 0.4 * det), st, slab);
  alb *= 1.0 - 0.6 * crack;
  float moss = uP1.y * (1.0 - slab) * smoothstep(0.5, 0.7, fbm1(uv, 10.0, 3, uSeed + 6.0));
  alb = mix(alb, vec3(0.03, 0.042, 0.015), moss);
  float rough = mix(0.92, 0.78 - 0.25 * dish * uP1.x + 0.1 * det, slab);
  return mk(alb, h, mix(rough, 1.0, moss), 0.0);
}

// uP0 = (rows, cols, gap, chip)  uP1 = (_, moss, lichen, _)
S slate(vec2 uv) {
  vec2 id, bs;
  vec4 A = ashlar(uv, uP0.x, uP0.y, 0.1, 0.4, uSeed, id, bs);
  float rnd = A.w;
  float edgeN = fbm(uv, vec2(40.0, uP0.x), 3, uSeed + 1.0);
  // ragged bottom edge + rounded/chipped bottom corners
  float corner = smoothstep(0.25, 0.0, min(A.x, 1.0 - A.x)) * 0.25 * uP0.w;
  float ly = A.y - 0.12 * (edgeN - 0.5) * uP0.w - corner * (1.0 - A.y);
  float below = step(ly, 0.0);
  float lyc = clamp(ly, 0.0, 1.0);
  float cleave = vfbm(uv, vec2(3.0, 90.0), 3, uSeed + 2.0);
  float det = fbm1(uv, 20.0, 3, uSeed + 3.0);
  float joint = 1.0 - smoothstep(uP0.z * 0.3, uP0.z, min(A.x, 1.0 - A.x) * bs.x);
  float slateH = 0.3 + 0.58 * (1.0 - lyc) + 0.05 * (cleave - 0.5) + 0.04 * (rnd - 0.5);
  float h = mix(slateH, 0.26 + 0.04 * cleave, max(below, joint * (1.0 - below)));
  vec3 c = mix(uC0, uC1, rnd) * (0.8 + 0.3 * det) * (0.9 + 0.2 * cleave);
  c *= mix(1.0, 0.45, below);      // row below sits in shadow
  c *= 1.0 - 0.6 * joint;
  float lich = smoothstep(0.7, 0.76, fbm1(uv, 14.0, 4, uSeed + 4.0)) * uP1.z;
  c = mix(c, uC3, lich * (1.0 - below));
  float moss = uP1.y * smoothstep(0.55, 0.75, fbm1(uv, 8.0, 3, uSeed + 5.0) + (1.0 - lyc) * 0.1 + below * 0.3);
  c = mix(c, vec3(0.03, 0.04, 0.015), moss);
  float rough = mix(0.62 + 0.15 * det, 0.9, below) ;
  return mk(c, h, mix(rough, 0.95, max(moss, lich)), 0.0);
}

// uP0 = (bigCells, gravelCells, charred, _)
S rubble(vec2 uv) {
  vec2 tp;
  vec3 v = voronoiEdge(uv, vec2(uP0.x), 1.0, uSeed, tp);
  float rnd = v.y;
  vec2 dir = vec2(cos(rnd * TAU), sin(rnd * TAU));
  float facet = dot(-tp, dir) * 0.45;
  float big = (0.45 + 0.35 * rnd + facet) * smoothstep(0.0, 0.2, v.x) * step(0.25, rnd);
  vec2 tp2;
  vec3 g = voronoiEdge(uv, vec2(uP0.y), 1.0, uSeed + 7.0, tp2);
  float gravel = smoothstep(0.0, 0.18, g.x) * (0.22 + 0.2 * g.y);
  float det = fbm1(uv, 48.0, 3, uSeed + 2.0);
  float h = max(big, gravel) + 0.05 * (det - 0.5);
  float isBig = step(gravel, big);
  vec3 c = mix(uC0, uC1, isBig > 0.5 ? rnd : g.y) * (0.75 + 0.5 * det);
  float charred = step(1.0 - uP0.z, fract(rnd * 7.31)) * isBig;
  c = mix(c, uC3 * (0.7 + 0.6 * det), charred);
  float dust = 1.0 - smoothstep(0.12, 0.3, h);
  c = mix(c, uC2 * (0.8 + 0.3 * det), dust);
  return mk(c, h, 0.9 + 0.08 * det, 0.0);
}

// uP0 = (layers, fractureFreq, _, _)  uP1 = (ironStain, moss, _, _)
S cliff(vec2 uv) {
  float warp = fbm(uv, vec2(2.0, 3.0), 4, uSeed);
  float y = uv.y * uP0.x + warp * 1.8;
  float layer = floor(y), band = fract(y);
  float lr = hf(imodf(layer, uP0.x), uSeed + 2.0);
  float fr = ridged(uv, vec2(uP0.y, 2.0), 3, uSeed + 3.0);
  float crack = smoothstep(0.8, 0.95, fr);
  float det = fbm1(uv, 16.0, 5, uSeed + 4.0);
  float fine = gnoise(uv * 128.0, vec2(128.0), uSeed + 5.0);
  float ledge = smoothstep(0.0, 0.1, band);
  float h = 0.3 + 0.3 * lr + 0.22 * (1.0 - band) * ledge + 0.22 * (det - 0.5) - 0.3 * crack + 0.02 * fine;
  vec3 c = mix(uC0, uC1, lr) * (0.72 + 0.56 * det) * (0.93 + 0.14 * fine);
  float streak = smoothstep(0.6, 0.8, fbm(uv, vec2(20.0, 2.0), 3, uSeed + 6.0)) * uP1.x;
  c = mix(c, uC3 * (0.8 + 0.4 * det), streak * 0.7);
  c *= 1.0 - 0.6 * crack;
  float moss = uP1.y * (1.0 - ledge) * smoothstep(0.4, 0.6, det);
  c = mix(c, vec3(0.03, 0.045, 0.016), moss);
  return mk(c, h, mix(0.86 + 0.08 * det, 1.0, moss), 0.0);
}

void main() {
  vec2 uv = vUv;
  S s;
  if (uKind == 0) s = ashlarStone(uv);
  else if (uKind == 1) s = cobble(uv);
  else if (uKind == 2) s = flagstone(uv);
  else if (uKind == 3) s = slate(uv);
  else if (uKind == 4) s = rubble(uv);
  else s = cliff(uv);
  emit(s);
}
`;
