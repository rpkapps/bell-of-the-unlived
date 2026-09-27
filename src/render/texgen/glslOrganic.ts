/**
 * Organic family: leather, woven cloth (plain/twill, faded, threadbare, darned), rope, skin, hair,
 * bone, parchment, wax, wattle plaster, and the heraldic banner (cloth + embroidered arms from
 * uMask, tattered bottom edge in alpha).
 */
export const ORGANIC_KINDS = {
  leather: 0, cloth: 1, rope: 2, skin: 3, hair: 4, bone: 5, parchment: 6, wax: 7, plaster: 8, banner: 9,
} as const;

export const GLSL_ORGANIC = /* glsl */ `
// uP0 = (grainFreq, creases, scuffs, stains)  uC0 leather, uC1 scuff, uC2 stain/dark
S leather(vec2 uv) {
  vec4 w = worley(uv, vec2(uP0.x), 1.0, uSeed);
  float pebble = smoothstep(0.0, 0.7, w.x);
  float det = fbm1(uv, 8.0, 4, uSeed + 1.0);
  float cr = ridged(uv, vec2(3.0, 5.0), 3, uSeed + 2.0);
  float crease = smoothstep(0.72, 0.92, cr) * uP0.y;
  float scuff = smoothstep(0.62, 0.8, fbm1(uv, 6.0, 4, uSeed + 3.0)) * uP0.z;
  float stain = smoothstep(0.55, 0.8, fbm1(uv, 3.0, 3, uSeed + 4.0)) * uP0.w;
  float h = 0.55 - 0.08 * pebble - 0.2 * crease + 0.05 * (det - 0.5);
  vec3 c = uC0 * (0.8 + 0.4 * det) * (1.0 - 0.12 * pebble);
  c *= 1.0 - 0.45 * crease;
  c = mix(c, uC2, stain * 0.6);
  c = mix(c, uC1 * (0.8 + 0.4 * det), scuff * 0.7);
  float rough = 0.55 + 0.15 * pebble + 0.2 * scuff - 0.1 * stain;
  return mk(c, h, rough, 0.0);
}

// Woven cloth. uP0 = (threads, twill, fade, threadbare)  uP1 = (darns, stains, fuzz, _)
// uC0 dye, uC1 faded, uC2 stain, uC3 darning thread
S cloth(vec2 uv) {
  float N = uP0.x;
  vec2 g = uv * N; vec2 cell = floor(g); vec2 f = fract(g);
  float over = uP0.y > 0.5 ? step(1.5, imodf(cell.x - cell.y, 4.0)) : imodf(cell.x + cell.y, 2.0);
  float warpP = 1.0 - pow(abs(f.x - 0.5) * 2.0, 2.0);
  float weftP = 1.0 - pow(abs(f.y - 0.5) * 2.0, 2.0);
  float hw = warpP * mix(0.5, 1.0, over) * (0.75 + 0.25 * sin(f.y * PI));
  float hf2 = weftP * mix(1.0, 0.5, over) * (0.75 + 0.25 * sin(f.x * PI));
  float isWarp = step(hf2, hw);
  float th = max(hw, hf2);
  float tv = isWarp > 0.5 ? h1(ivec2(int(imodf(cell.x, N)), 0), uSeed) : h1(ivec2(0, int(imodf(cell.y, N))), uSeed + 1.0);
  float fuzz = gnoise(uv * N * 2.0, vec2(N * 2.0), uSeed + 2.0);
  float fade = smoothstep(0.35, 0.85, fbm1(uv, 3.0, 4, uSeed + 3.0)) * uP0.z;
  float bare = smoothstep(0.66, 0.82, fbm1(uv, 5.0, 4, uSeed + 4.0)) * uP0.w;
  float stain = smoothstep(0.55, 0.85, fbm1(uv, 4.0, 4, uSeed + 5.0)) * uP1.y;
  // darned patches: roundish regions re-woven in a finer, off-colour thread
  vec4 dw = worley(uv, vec2(3.0), 0.8, uSeed + 6.0);
  float darn = (1.0 - smoothstep(0.17, 0.2, dw.x)) * step(dw.z, uP1.x);
  float ring = (smoothstep(0.15, 0.18, dw.x) - smoothstep(0.19, 0.22, dw.x)) * step(dw.z, uP1.x);
  vec2 g2 = uv * N * 1.6; vec2 f2 = fract(g2);
  float dth = max(1.0 - pow(abs(f2.x - 0.5) * 2.0, 2.0), 1.0 - pow(abs(f2.y - 0.5) * 2.0, 2.0));
  vec3 c = uC0 * (0.82 + 0.3 * tv) * (0.72 + 0.32 * th) * (0.94 + 0.12 * fuzz);
  c = mix(c, uC1 * (0.85 + 0.25 * tv), fade);
  c = mix(c, c * 1.3 + 0.012, bare);
  c = mix(c, uC2, stain * 0.55);
  c = mix(c, uC3 * (0.75 + 0.3 * dth), darn);
  c *= 1.0 - 0.5 * ring;
  float h = th * mix(1.0, 0.45, bare) * 0.8 + 0.08 * fuzz * uP1.z;
  h = mix(h, dth * 0.7 + 0.15, darn);
  float rough = 0.86 + 0.08 * fuzz + 0.05 * bare;
  return mk(c, h * 0.6 + 0.2, rough, 0.0);
}

// Banner: cloth + embroidered/painted charge from uMask, tattered hem. uP0/uP1 as cloth;
// uC3 = charge thread colour (gold).
S banner(vec2 uv) {
  S s = cloth(uv);
  float mask = uHasMask > 0.5 ? texture(uMask, uv).a : 0.0;
  vec2 tp;
  vec3 fl = voronoiEdge(uv, vec2(30.0, 60.0), 1.0, uSeed + 11.0, tp);
  float lossField = fbm1(uv, 4.0, 4, uSeed + 12.0);
  float lost = step(fl.y, 0.35 * smoothstep(0.35, 0.8, lossField));
  float stitch = 0.6 + 0.4 * sin((uv.x * 0.7 + uv.y) * 900.0);
  float emb = mask * (1.0 - lost) * (1.0 - (1.0 - smoothstep(0.0, 0.05, fl.x)) * 0.6);
  vec3 gold = uC3 * (0.7 + 0.35 * stitch) * (0.85 + 0.3 * fbm1(uv, 20.0, 2, uSeed + 13.0));
  s.alb = mix(s.alb, gold, emb);
  s.h = mix(s.h, 0.75 + 0.15 * stitch, emb);
  s.rough = mix(s.rough, 0.5, emb);
  s.metal = emb * 0.55;
  // tattered bottom hem, scorch toward it, a few holes low down
  float tear = 0.04 + 0.12 * vfbm(vec2(uv.x, 0.5), vec2(24.0, 1.0), 4, uSeed + 14.0);
  vec4 hw = worley(uv, vec2(9.0, 18.0), 1.0, uSeed + 15.0);
  float hole = (1.0 - smoothstep(0.08, 0.12, hw.x)) * step(0.88, hw.z) * smoothstep(0.45, 0.15, uv.y);
  s.alpha = step(tear, uv.y) * (1.0 - hole);
  float scorch = smoothstep(0.25, 0.0, uv.y - tear) * 0.8;
  s.alb *= 1.0 - scorch * 0.75;
  // hem sleeve at the top
  float hem = smoothstep(0.955, 0.965, uv.y);
  s.h += hem * 0.2;
  s.alb *= 1.0 - 0.25 * (smoothstep(0.95, 0.955, uv.y) - smoothstep(0.955, 0.96, uv.y));
  return s;
}

// Rope: uP0 = (strandsU, twistV, _, _)  uC0 hemp, uC1 fibre highlight, uC2 dirt
S rope(vec2 uv) {
  float t = uv.x * uP0.x + uv.y * uP0.y;
  float strand = fract(t);
  float prof = sin(strand * PI);
  float fib = vfbm(vec2(uv.x * uP0.x * 6.0 - uv.y * 2.0, t * 3.0), vec2(uP0.x * 6.0, 3.0), 2, uSeed);
  float det = fbm1(uv, 6.0, 3, uSeed + 1.0);
  float h = 0.2 + 0.65 * sqrt(prof) + 0.12 * (fib - 0.5);
  vec3 c = uC0 * (0.45 + 0.6 * prof) * (0.85 + 0.3 * fib);
  c = mix(c, uC1, smoothstep(0.75, 0.9, fib) * 0.5);
  c = mix(c, uC2, smoothstep(0.55, 0.8, det) * 0.5);
  return mk(c, h, 0.88 + 0.1 * fib, 0.0);
}

// Skin: uP0 = (pores, veins, mottling, wrinkles)  uC0 skin, uC1 redness, uC2 vein
S skin(vec2 uv) {
  float pores = gnoise(uv * 180.0, vec2(180.0), uSeed);
  float det = fbm1(uv, 6.0, 4, uSeed + 1.0);
  float mot = fbm1(uv, 3.0, 4, uSeed + 2.0);
  float vein = smoothstep(0.86, 0.96, ridged(uv, vec2(4.0, 3.0), 3, uSeed + 3.0)) * uP0.y;
  float wr = smoothstep(0.75, 0.95, ridged(uv, vec2(2.0, 12.0), 2, uSeed + 4.0)) * uP0.w;
  vec3 c = mix(uC0, uC1, smoothstep(0.35, 0.8, mot) * uP0.z) * (0.93 + 0.14 * det);
  c = mix(c, uC2, vein * 0.35);
  float h = 0.55 - 0.05 * smoothstep(0.55, 0.8, pores) * uP0.x - 0.08 * wr + 0.03 * det;
  return mk(c, h, 0.5 + 0.12 * pores + 0.08 * det, 0.0);
}

// Hair: uP0 = (strands, clumps, _, _)  uC0 base, uC1 highlight
S hair(vec2 uv) {
  float st = vfbm(uv, vec2(uP0.x, 3.0), 2, uSeed);
  float cl = fbm(uv, vec2(uP0.y, 1.0), 3, uSeed + 1.0);
  float h = 0.3 + 0.35 * cl + 0.3 * st * cl;
  vec3 c = mix(uC0 * 0.7, uC1, st * cl) * (0.8 + 0.4 * cl);
  return mk(c, h, 0.42 + 0.15 * (1.0 - st), 0.0);
}

// Bone: uP0 = (pores, cracks, stain, _)  uC0 ivory, uC1 stain, uC2 dark
S bone(vec2 uv) {
  float det = fbm1(uv, 8.0, 4, uSeed);
  vec4 w = worley(uv, vec2(40.0), 1.0, uSeed + 1.0);
  float pore = (1.0 - smoothstep(0.05, 0.25, w.x)) * step(0.6, w.z) * uP0.x;
  float cr = smoothstep(0.9, 0.97, ridged(uv, vec2(3.0, 6.0), 3, uSeed + 2.0)) * uP0.y;
  float st = smoothstep(0.5, 0.8, fbm1(uv, 4.0, 4, uSeed + 3.0)) * uP0.z;
  float h = 0.55 + 0.08 * (det - 0.5) - 0.12 * pore - 0.3 * cr;
  vec3 c = uC0 * (0.85 + 0.3 * det);
  c = mix(c, uC1, st * 0.6 + pore * 0.4);
  c = mix(c, uC2, cr * 0.8);
  return mk(c, h, 0.62 + 0.15 * det, 0.0);
}

// Parchment: uP0 = (rows of script, foxing, stains, ink)  uC0 vellum, uC1 foxing, uC2 ink
S parchment(vec2 uv) {
  float fib = vfbm(uv, vec2(6.0, 60.0), 3, uSeed);
  float det = fbm1(uv, 5.0, 5, uSeed + 1.0);
  vec4 w = worley(uv, vec2(12.0), 1.0, uSeed + 2.0);
  float fox = (1.0 - smoothstep(0.05, 0.3, w.x)) * step(0.72, w.z) * uP0.y;
  float ringN = fbm1(uv, 2.0, 3, uSeed + 3.0);
  float ringS = (1.0 - smoothstep(0.0, 0.02, abs(ringN - 0.55))) * uP0.z;
  float rows = uP0.x;
  float ry = uv.y * rows; float row = floor(ry); float fy = fract(ry);
  float band = smoothstep(0.3, 0.38, fy) * (1.0 - smoothstep(0.62, 0.7, fy));
  float glyph = step(0.55, vnoise(vec2(uv.x * 220.0, row * 3.0 + fy * 6.0), vec2(220.0, rows * 3.0), uSeed + 4.0));
  float words = step(0.38, vnoise(vec2(uv.x * 22.0, row), vec2(22.0, rows), uSeed + 5.0));
  float margin = step(0.08, fract(uv.x)) * step(fract(uv.x), 0.92);
  float ink = band * glyph * words * margin * uP0.w * (0.55 + 0.45 * det);
  vec3 c = uC0 * (0.82 + 0.25 * det) * (0.94 + 0.12 * fib);
  c = mix(c, uC1, fox * 0.7 + ringS * 0.4 + smoothstep(0.6, 0.9, det) * 0.2);
  c = mix(c, uC2, ink);
  return mk(c, 0.5 + 0.05 * fib + 0.05 * det, 0.82 + 0.1 * fib, 0.0);
}

// Wax: uP0 = (drips, soot, _, _)  uC0 wax, uC1 yellowed drip, uC2 soot
S wax(vec2 uv) {
  float run = fbm(uv, vec2(10.0, 1.0), 3, uSeed);
  float drip = smoothstep(0.55, 0.7, run) * uP0.x;
  float det = fbm1(uv, 6.0, 4, uSeed + 1.0);
  float soot = smoothstep(0.7, 0.9, fbm1(uv, 12.0, 3, uSeed + 2.0)) * uP0.y;
  vec3 c = mix(uC0, uC1, drip * 0.7 + det * 0.15);
  c = mix(c, uC2, soot * 0.5);
  float h = 0.5 + 0.2 * drip + 0.04 * (det - 0.5);
  return mk(c, h, 0.32 + 0.12 * det + 0.2 * soot, 0.0);
}

// Wattle-and-daub plaster: uP0 = (cracks, flaking, timberStains, mildew)
// uC0 limewash, uC1 yellowed, uC2 exposed daub, uC3 tannin stain
S plaster(vec2 uv) {
  float det = fbm1(uv, 6.0, 5, uSeed);
  float fine = gnoise(uv * 120.0, vec2(120.0), uSeed + 1.0);
  float blotch = fbm1(uv, 3.0, 4, uSeed + 2.0);
  vec2 tp;
  vec3 v = voronoiEdge(uv, vec2(5.0), 1.0, uSeed + 3.0, tp);
  float crackZone = smoothstep(0.5, 0.7, fbm1(uv, 4.0, 3, uSeed + 4.0));
  float crack = (1.0 - smoothstep(0.0, 0.025, v.x + 0.03 * (det - 0.5))) * crackZone * uP0.x;
  float flakeN = fbm1(uv, 5.0, 5, uSeed + 5.0);
  float flake = smoothstep(0.7 - uP0.y * 0.15, 0.72 - uP0.y * 0.15, flakeN);
  float lip = smoothstep(0.66 - uP0.y * 0.15, 0.7 - uP0.y * 0.15, flakeN) - flake;
  float streak = smoothstep(0.55, 0.85, fbm(uv, vec2(16.0, 1.0), 3, uSeed + 6.0)) * uP0.z;
  float mildew = smoothstep(0.72, 0.85, fbm1(uv, 20.0, 3, uSeed + 7.0)) * uP0.w;
  vec3 c = mix(uC0, uC1, smoothstep(0.3, 0.8, blotch)) * (0.9 + 0.12 * fine);
  c = mix(c, uC3, streak * 0.55);
  c = mix(c, vec3(0.06, 0.07, 0.05), mildew * 0.5);
  vec3 daub = uC2 * (0.75 + 0.5 * det) * (0.9 + 0.2 * fine);
  c = mix(c, daub, flake);
  c *= 1.0 - 0.3 * lip - 0.6 * crack;
  float h = 0.62 + 0.05 * (det - 0.5) + 0.01 * fine - 0.25 * flake - 0.3 * crack + 0.03 * lip;
  float rough = mix(0.9 + 0.06 * fine, 0.97, flake);
  return mk(c, h, rough, 0.0);
}

void main() {
  vec2 uv = vUv;
  S s;
  if (uKind == 0) s = leather(uv);
  else if (uKind == 1) s = cloth(uv);
  else if (uKind == 2) s = rope(uv);
  else if (uKind == 3) s = skin(uv);
  else if (uKind == 4) s = hair(uv);
  else if (uKind == 5) s = bone(uv);
  else if (uKind == 6) s = parchment(uv);
  else if (uKind == 7) s = wax(uv);
  else if (uKind == 8) s = plaster(uv);
  else s = banner(uv);
  emit(s);
}
`;
