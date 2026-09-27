/**
 * Metal family: black iron, rusted iron, blackened armour steel, blade steel, funerary bronze,
 * bell bronze, worn gilt, and the two glowing-crack surfaces (Unlived cracks, embers).
 * Emissive masks go to outB.a (read by the material's emissive patch).
 */
export const METAL_KINDS = { iron: 0, ironRusted: 1, steelArmor: 2, steelBright: 3, bronze: 4, bell: 5, gilt: 6, crack: 7, ember: 8 } as const;

export const GLSL_METAL = /* glsl */ `
// uP0 = (dentFreq, rust, scratch, pitting)  uC0 iron, uC1 dark rust, uC2 orange rust, uC3 scratch metal
S iron(vec2 uv, bool heavy) {
  vec4 w = worley(uv, vec2(uP0.x), 0.9, uSeed);
  float dent = smoothstep(0.0, 0.75, w.x);
  float det = fbm1(uv, 32.0, 4, uSeed + 1.0);
  float fine = gnoise(uv * 140.0, vec2(140.0), uSeed + 6.0);
  float pits = smoothstep(0.68, 0.84, gnoise(uv * 80.0, vec2(80.0), uSeed + 2.0)) * uP0.w;
  float rustN = fbm1(uv, 6.0, 5, uSeed + 3.0);
  float rust = smoothstep(0.64 - uP0.y * 0.4, 0.78 - uP0.y * 0.36, rustN + pits * 0.35 + (1.0 - dent) * 0.08);
  float flake = heavy ? floor((rustN + det * 0.3) * 5.0) / 5.0 : 0.0;
  float scr = scratches(uv, vec2(1.0, 0.0), vec2(0.0, 1.0), 3.0, 80.0, 0.15, uSeed + 4.0) * uP0.z;
  float h = 0.55 + 0.14 * dent * dent + 0.05 * (det - 0.5) - 0.1 * pits + rust * (0.05 * rustN + 0.12 * flake) - 0.04 * scr;
  vec3 m = uC0 * (0.8 + 0.4 * det) * (0.94 + 0.12 * fine);
  vec3 rc = mix(uC1, uC2, smoothstep(0.3, 0.85, fbm1(uv, 24.0, 3, uSeed + 5.0) + flake * 0.3));
  rc *= 0.8 + 0.4 * fine;
  vec3 c = mix(m, rc, rust);
  c = mix(c, uC3, scr * (1.0 - rust));
  float rough = mix(0.5 + 0.18 * det, 0.9 + 0.08 * fine, rust);
  rough = mix(rough, 0.3, scr * (1.0 - rust));
  return mk(c, h, rough, 1.0 - rust);
}

// uP0 = (scratches, rust, nicks, bluing)  uC0 black steel, uC1 bluing, uC2 polished steel, uC3 rust
S steelArmor(vec2 uv) {
  float det = fbm1(uv, 12.0, 4, uSeed);
  float fine = vfbm(uv, vec2(4.0, 120.0), 2, uSeed + 1.0);
  float s = max(scratches(uv, vec2(1.0, 0.0), vec2(0.0, 1.0), 3.0, 110.0, 0.16, uSeed + 2.0),
            max(scratches(uv, vec2(1.0, 1.0), vec2(-1.0, 1.0), 2.0, 80.0, 0.13, uSeed + 3.0),
                scratches(uv, vec2(2.0, -1.0), vec2(1.0, 2.0), 2.0, 70.0, 0.1, uSeed + 4.0))) * uP0.x;
  vec4 w = worley(uv, vec2(10.0), 1.0, uSeed + 5.0);
  float nickM = step(1.0 - 0.25 * uP0.z, w.z);
  float nick = (1.0 - smoothstep(0.02, 0.1, w.x)) * nickM;
  float nickRim = (smoothstep(0.06, 0.1, w.x) - smoothstep(0.1, 0.16, w.x)) * nickM;
  float rust = smoothstep(0.82, 0.9, gnoise(uv * 48.0, vec2(48.0), uSeed + 6.0) + s * 0.1) * uP0.y;
  float blu = smoothstep(0.35, 0.8, fbm1(uv, 3.0, 3, uSeed + 7.0)) * uP0.w;
  vec3 c = mix(uC0, uC1, blu) * (0.85 + 0.3 * det);
  c = mix(c, uC2, sat01(s * 0.85 + nickRim * 0.6));
  c = mix(c, uC3, rust);
  float rough = 0.4 + 0.12 * det + 0.06 * fine;
  rough = mix(rough, 0.2, sat01(s + nickRim * 0.5));
  rough = mix(rough, 0.85, rust);
  float h = 0.55 + 0.04 * (det - 0.5) - 0.05 * s - 0.3 * nick + 0.03 * nickRim;
  return mk(c, h, rough, 1.0 - rust);
}

// uP0 = (grind, rust, scratches, stains)  uC0 steel, uC1 stain, uC2 polished, uC3 rust
S steelBright(vec2 uv) {
  float grind = vfbm(uv, vec2(2.0, 320.0), 2, uSeed);
  float det = fbm1(uv, 8.0, 4, uSeed + 1.0);
  float s = max(scratches(uv, vec2(1.0, 0.0), vec2(0.0, 1.0), 2.0, 140.0, 0.14, uSeed + 2.0),
                scratches(uv, vec2(1.0, 1.0), vec2(-1.0, 1.0), 3.0, 90.0, 0.12, uSeed + 3.0)) * uP0.z;
  float pits = smoothstep(0.86, 0.93, gnoise(uv * 90.0, vec2(90.0), uSeed + 4.0)) * 0.6;
  float stain = smoothstep(0.5, 0.8, fbm1(uv, 4.0, 4, uSeed + 5.0)) * uP0.w;
  float rust = smoothstep(0.85, 0.92, gnoise(uv * 40.0, vec2(40.0), uSeed + 6.0) + pits * 0.2) * uP0.y;
  vec3 c = uC0 * (0.9 + 0.12 * grind * uP0.x + 0.08 * det);
  c = mix(c, uC1, stain * 0.6);
  c = mix(c, uC2, s);
  c *= 1.0 - 0.5 * pits;
  c = mix(c, uC3, rust);
  float rough = 0.26 + 0.12 * grind * uP0.x + 0.1 * stain;
  rough = mix(rough, 0.14, s);
  rough = mix(rough, 0.85, max(rust, pits * 0.6));
  float h = 0.55 + 0.03 * grind - 0.05 * s - 0.08 * pits;
  return mk(c, h, rough, 1.0 - rust);
}

// Bronze (funerary) and bell bronze.
// uP0 = (verdigris, drips, oxide, rubbed)  uC0 bronze, uC1 oxide, uC2 verdigris, uC3 rubbed bright
S bronze(vec2 uv, bool bell) {
  float castN = fbm1(uv, 6.0, 5, uSeed);
  float det = fbm1(uv, 40.0, 3, uSeed + 1.0);
  float fine = gnoise(uv * 160.0, vec2(160.0), uSeed + 9.0);
  float pits = smoothstep(0.68, 0.82, gnoise(uv * 70.0, vec2(70.0), uSeed + 2.0));
  float h = 0.5 + 0.28 * (castN - 0.5) + 0.05 * (det - 0.5) - 0.1 * pits;
  float recess = sat01((0.52 - h) * 5.0 + pits * 0.9);
  float patN = fbm1(uv, 10.0, 4, uSeed + 3.0);
  float verd = smoothstep(0.5, 0.72, recess * 0.75 + patN * 0.55 - 0.18 + uP0.x * 0.25) * uP0.x;
  if (bell) {
    float streak = fbm(uv, vec2(18.0, 2.0), 3, uSeed + 4.0);
    float run = smoothstep(0.6, 0.78, streak + patN * 0.15) * uP0.y;
    verd = max(verd, run * (0.55 + 0.45 * det));
  }
  float oxide = smoothstep(0.3, 0.7, fbm1(uv, 4.0, 4, uSeed + 5.0)) * uP0.z;
  float rub = smoothstep(0.56, 0.72, h + det * 0.12) * uP0.w * (1.0 - verd);
  vec3 b = mix(uC0, uC1, oxide) * (0.85 + 0.3 * det);
  b = mix(b, uC3, rub);
  vec3 v = mix(uC2, uC2 * 1.5 + vec3(0.02, 0.03, 0.025), smoothstep(0.4, 0.8, det)) * (0.85 + 0.3 * fine);
  vec3 c = mix(b, v, verd);
  float rough = mix(mix(0.36, 0.6, oxide), 0.88, verd);
  rough = mix(rough, 0.24, rub);
  h += verd * 0.05 * det;
  return mk(c, h, rough, 1.0 - verd);
}

// Worn gilt. uP0 = (wearThrough, grime, tooling, _)  uC0 gold, uC1 bole, uC2 grime
S gilt(vec2 uv) {
  float castN = fbm1(uv, 5.0, 4, uSeed);
  float det = fbm1(uv, 32.0, 3, uSeed + 1.0);
  vec2 g = uv * vec2(48.0, 48.0);
  float row = floor(g.y);
  vec2 f = fract(vec2(g.x + 0.5 * imodf(row, 2.0), g.y)) - 0.5;
  float punch = (1.0 - smoothstep(0.12, 0.22, length(f))) * uP0.z;
  float h = 0.5 + 0.25 * (castN - 0.5) + 0.04 * (det - 0.5) - 0.06 * punch;
  float worn = smoothstep(0.58, 0.74, h + fbm1(uv, 12.0, 3, uSeed + 2.0) * 0.3 - 0.1) * uP0.x;
  float grime = smoothstep(0.45, 0.25, h) * uP0.y + punch * 0.5 * uP0.y;
  vec3 c = uC0 * (0.85 + 0.3 * det);
  c = mix(c, uC1 * (0.8 + 0.4 * det), worn);
  c = mix(c, uC2, sat01(grime));
  float metal = (1.0 - worn) * (1.0 - sat01(grime) * 0.7);
  float rough = mix(0.28 + 0.1 * det, 0.72, worn);
  rough = mix(rough, 0.85, sat01(grime));
  return mk(c, h, rough, metal);
}

// Glowing cracks. uP0 = (cells, cells2, width, _)  uP1 = (metalness, _, _, _)
// uC0 dark surface, uC1 crack gold, uC2 surface alt
S crack(vec2 uv) {
  vec2 tp;
  vec3 v1 = voronoiEdge(uv, vec2(uP0.x), 1.0, uSeed, tp);
  vec3 v2 = voronoiEdge(uv, vec2(uP0.y), 1.0, uSeed + 5.0, tp);
  float det = fbm1(uv, 16.0, 4, uSeed + 1.0);
  float branch = smoothstep(0.45, 0.62, fbm1(uv, 4.0, 3, uSeed + 2.0));
  float wv = uP0.z * (0.45 + 0.9 * fbm1(uv, 12.0, 3, uSeed + 3.0));
  float c1 = 1.0 - smoothstep(wv * 0.35, wv, v1.x);
  float c2 = (1.0 - smoothstep(wv * 0.15, wv * 0.55, v2.x)) * branch;
  float cr = max(c1, c2 * 0.85);
  float halo = 1.0 - smoothstep(0.0, wv * 5.0, min(v1.x, v2.x + (1.0 - branch)));
  vec3 base = mix(uC0, uC2, det) * (0.75 + 0.5 * det);
  vec3 c = mix(base, uC1, cr);
  c = mix(c, base * 1.2 + uC1 * 0.08, halo * (1.0 - cr) * 0.5);
  float h = 0.6 + 0.1 * (det - 0.5) - 0.4 * cr;
  S s = mk(c, h, mix(0.62, 0.4, cr), uP1.x * (1.0 - cr));
  s.emis = max(cr, halo * 0.22);
  return s;
}

// Embers: charred chunks, glowing cracks and hot spots. uP0 = (cells, glow, ash, _)
// uC0 char, uC1 glow orange, uC2 ash
S ember(vec2 uv) {
  vec2 tp;
  vec3 v = voronoiEdge(uv, vec2(uP0.x), 1.0, uSeed, tp);
  float det = fbm1(uv, 20.0, 4, uSeed + 1.0);
  float cr = 1.0 - smoothstep(0.0, 0.1, v.x + (det - 0.5) * 0.06);
  float hot = smoothstep(1.0 - 0.45 * uP0.y, 1.0, v.y) * smoothstep(0.35, 0.75, det);
  float ash = smoothstep(0.62, 0.8, fbm1(uv, 8.0, 4, uSeed + 2.0)) * uP0.z;
  float glow = max(cr, hot * (0.4 + 0.6 * (1.0 - v.z))) * (1.0 - ash);
  vec3 c = mix(uC0 * (0.7 + 0.6 * det), uC1, glow * 0.8);
  c = mix(c, uC2 * (0.8 + 0.4 * det), ash);
  float h = 0.3 + 0.5 * sqrt(smoothstep(0.0, 0.3, v.x)) + 0.06 * det - 0.2 * cr;
  S s = mk(c, h, 0.85, 0.0);
  s.emis = glow;
  return s;
}

void main() {
  vec2 uv = vUv;
  S s;
  if (uKind == 0) s = iron(uv, false);
  else if (uKind == 1) s = iron(uv, true);
  else if (uKind == 2) s = steelArmor(uv);
  else if (uKind == 3) s = steelBright(uv);
  else if (uKind == 4) s = bronze(uv, false);
  else if (uKind == 5) s = bronze(uv, true);
  else if (uKind == 6) s = gilt(uv);
  else if (uKind == 7) s = crack(uv);
  else s = ember(uv);
  emit(s);
}
`;
