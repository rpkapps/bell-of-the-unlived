/**
 * Ground family (dirt, mud, dead grass, moss) and special surfaces (old glass, water ripples,
 * leaded warm window, pale bell-light).
 */
export const GROUND_KINDS = { dirt: 0, mud: 1, grass: 2, moss: 3 } as const;
export const SPECIAL_KINDS = { glass: 0, water: 1, window: 2, bellLight: 3 } as const;

export const GLSL_GROUND = /* glsl */ `
// uP0 = (pebbles, damp, clumps, _)  uC0 soil, uC1 pebble, uC2 damp dark
S dirt(vec2 uv) {
  float det = fbm1(uv, 8.0, 5, uSeed);
  float fine = gnoise(uv * 140.0, vec2(140.0), uSeed + 1.0);
  vec4 w = worley(uv, vec2(26.0), 1.0, uSeed + 2.0);
  float peb = (1.0 - smoothstep(0.18, 0.34, w.x)) * step(1.0 - 0.45 * uP0.x, w.z);
  vec4 w2 = worley(uv, vec2(60.0), 1.0, uSeed + 3.0);
  float grit = (1.0 - smoothstep(0.1, 0.3, w2.x)) * step(0.55, w2.z);
  float damp = smoothstep(0.5, 0.75, fbm1(uv, 3.0, 4, uSeed + 4.0)) * uP0.y;
  float clump = fbm1(uv, 20.0, 3, uSeed + 5.0) * uP0.z;
  float h = 0.4 + 0.15 * (det - 0.5) + 0.1 * clump + 0.28 * peb * (0.6 + 0.4 * w.z) + 0.06 * grit + 0.02 * fine;
  vec3 c = uC0 * (0.78 + 0.44 * det) * (0.92 + 0.16 * fine);
  c = mix(c, uC2, damp * 0.6);
  c = mix(c, uC1 * (0.7 + 0.6 * fract(w.z * 13.7)), peb);
  c = mix(c, uC1 * 0.8, grit * 0.35);
  float rough = mix(0.95, 0.72, damp) - 0.15 * peb;
  return mk(c, h, rough, 0.0);
}

// uP0 = (ruts, puddles, straw, _)  uC0 mud, uC1 dry crust, uC2 puddle water tint
S mud(vec2 uv) {
  float det = fbm1(uv, 6.0, 5, uSeed);
  float fine = gnoise(uv * 110.0, vec2(110.0), uSeed + 1.0);
  float rut = ridged(uv, vec2(1.0, 6.0), 3, uSeed + 2.0) * uP0.x;
  float pud = smoothstep(0.58, 0.64, fbm1(uv, 3.0, 4, uSeed + 3.0) + (0.5 - det) * 0.2) * uP0.y;
  float crust = smoothstep(0.55, 0.75, det) * (1.0 - pud);
  float straw = smoothstep(0.86, 0.95, vfbm(uv, vec2(60.0, 4.0), 2, uSeed + 4.0)) * uP0.z * (1.0 - pud);
  float h = 0.45 + 0.2 * (det - 0.5) - 0.12 * rut + 0.02 * fine;
  h = mix(h, 0.32, pud);
  vec3 c = uC0 * (0.8 + 0.4 * det) * (0.92 + 0.16 * fine);
  c = mix(c, uC1, crust * 0.45);
  c = mix(c, uC2, pud * 0.8);
  c = mix(c, vec3(0.18, 0.13, 0.06), straw);
  float rough = mix(mix(0.5, 0.75, crust), 0.04, pud);
  return mk(c, h, rough, 0.0);
}

// Dead grass: uP0 = (density, bladeLen, soil, _)  uC0 straw, uC1 grey-green, uC2 soil, uC3 brown
S grass(vec2 uv) {
  float soilN = fbm1(uv, 6.0, 4, uSeed);
  float b1 = vnoise(vec2(dot(uv, vec2(1.0, 0.0)) * 90.0, dot(uv, vec2(0.0, 1.0)) * 9.0), vec2(90.0, 9.0), uSeed + 1.0);
  float b2 = vnoise(vec2(dot(uv, vec2(1.0, 1.0)) * 70.0, dot(uv, vec2(-1.0, 1.0)) * 7.0), vec2(70.0, 7.0), uSeed + 2.0);
  float b3 = vnoise(vec2(dot(uv, vec2(2.0, -1.0)) * 50.0, dot(uv, vec2(1.0, 2.0)) * 6.0), vec2(50.0, 6.0), uSeed + 3.0);
  float b4 = vnoise(vec2(dot(uv, vec2(-1.0, 2.0)) * 45.0, dot(uv, vec2(2.0, 1.0)) * 6.0), vec2(45.0, 6.0), uSeed + 4.0);
  float blades = max(max(smoothstep(0.7, 0.9, b1), smoothstep(0.7, 0.9, b2)), max(smoothstep(0.7, 0.9, b3), smoothstep(0.72, 0.9, b4)));
  float tuft = smoothstep(0.35, 0.7, fbm1(uv, 5.0, 4, uSeed + 5.0)) * uP0.x;
  float cover = sat01(blades * (0.4 + tuft));
  float hue = fbm1(uv, 4.0, 3, uSeed + 6.0);
  vec3 bl = mix(uC0, uC1, smoothstep(0.35, 0.75, hue));
  bl = mix(bl, uC3, smoothstep(0.6, 0.85, fbm1(uv, 9.0, 3, uSeed + 7.0)) * 0.6);
  vec3 soil = uC2 * (0.75 + 0.5 * soilN);
  vec3 c = mix(soil, bl * (0.7 + 0.5 * blades), max(cover, tuft * 0.55));
  float h = 0.3 + 0.1 * soilN + 0.5 * cover;
  return mk(c, h, 0.88 + 0.1 * (1.0 - cover), 0.0);
}

// Moss: uP0 = (cushions, tips, _, _)  uC0 green, uC1 bright tip, uC2 dark
S moss(vec2 uv) {
  vec4 w = worley(uv, vec2(uP0.x), 0.9, uSeed);
  float cush = 1.0 - smoothstep(0.0, 0.8, w.x);
  float fuzz = gnoise(uv * 200.0, vec2(200.0), uSeed + 1.0);
  float det = fbm1(uv, 24.0, 4, uSeed + 2.0);
  float tip = smoothstep(0.6, 0.85, fuzz * 0.6 + cush * 0.5) * uP0.y;
  vec3 c = mix(uC2, uC0, smoothstep(0.1, 0.6, cush)) * (0.75 + 0.5 * det);
  c = mix(c, uC1, tip * 0.6);
  float h = 0.3 + 0.45 * sqrt(cush) + 0.1 * fuzz + 0.05 * det;
  return mk(c, h, 0.93 + 0.06 * fuzz, 0.0);
}

void main() {
  vec2 uv = vUv;
  S s;
  if (uKind == 0) s = dirt(uv);
  else if (uKind == 1) s = mud(uv);
  else if (uKind == 2) s = grass(uv);
  else s = moss(uv);
  emit(s);
}
`;

export const GLSL_SPECIAL = /* glsl */ `
// Old glass: uP0 = (wobble, grime, smudge, baseAlpha)  uC0 tint, uC1 grime
S glass(vec2 uv) {
  float wob = fbm1(uv, 3.0, 4, uSeed);
  float grime = smoothstep(0.45, 0.8, fbm1(uv, 4.0, 5, uSeed + 1.0)) * uP0.y;
  float smudge = smoothstep(0.5, 0.8, fbm1(uv, 10.0, 3, uSeed + 2.0)) * uP0.z;
  vec3 c = mix(uC0, uC1, grime);
  S s = mk(c, 0.5 + 0.3 * (wob - 0.5) * uP0.x, 0.05 + 0.25 * smudge + 0.5 * grime, 0.0);
  s.alpha = sat01(uP0.w + grime * 0.6);
  return s;
}
// Water ripples: uP0 = (scale, _, _, alpha)  uC0 murk
S water(vec2 uv) {
  float r = gnoise(uv * 8.0, vec2(8.0), uSeed) * 0.5 + gnoise(uv * 16.0, vec2(16.0), uSeed + 1.0) * 0.3
          + gnoise(uv * 32.0, vec2(32.0), uSeed + 2.0) * 0.2;
  S s = mk(uC0, r, 0.04, 0.0);
  s.alpha = uP0.w;
  return s;
}
// Leaded warm window: uP0 = (panesX, panesY, lead width, glow var)  uC0 glass (lit), uC1 lead, uC2 dim pane
S windowWarm(vec2 uv) {
  vec2 g = uv * uP0.xy; vec2 cell = floor(g); vec2 f = fract(g);
  vec2 d = min(f, 1.0 - f) / uP0.xy;
  float lead = 1.0 - smoothstep(uP0.z * 0.5, uP0.z * 0.5 + 0.004, min(d.x, d.y));
  float pv = h1(ivec2(cell), uSeed);
  float wob = fbm1(uv, 6.0, 3, uSeed + 1.0);
  float bull = 1.0 - smoothstep(0.0, 0.5, length(f - 0.5));
  float lit = mix(1.0 - uP0.w, 1.0, pv) * (0.75 + 0.3 * wob + 0.2 * bull);
  vec3 c = mix(mix(uC2, uC0, lit), uC1, lead);
  S s = mk(c, mix(0.4 + 0.1 * wob + 0.08 * bull, 0.8, lead), mix(0.18, 0.6, lead), lead * 0.4);
  s.emis = lit * (1.0 - lead);
  return s;
}
// Pale bell-light surface: uC0 gold-white
S bellLight(vec2 uv) {
  float n = fbm1(uv, 4.0, 4, uSeed);
  S s = mk(uC0 * (0.85 + 0.3 * n), 0.5 + 0.1 * n, 0.4, 0.0);
  s.emis = 0.7 + 0.3 * n;
  return s;
}
void main() {
  vec2 uv = vUv;
  S s;
  if (uKind == 0) s = glass(uv);
  else if (uKind == 1) s = water(uv);
  else if (uKind == 2) s = windowWarm(uv);
  else s = bellLight(uv);
  emit(s);
}
`;
