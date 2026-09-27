/**
 * GLSL (ES 3.00) building blocks for procedural, seamlessly tiling texture generation.
 *
 * Conventions: `uv` is tile space [0,1). Every noise takes an integer frequency (cells per tile)
 * and wraps its lattice with that period, so all patterns tile. Hashes are integer PCG so they are
 * stable across GPUs. No implicit int→float conversions (strict ES 3.00).
 */
export const GLSL_COMMON = /* glsl */ `
precision highp float;
precision highp int;

const float PI = 3.14159265;
const float TAU = 6.28318531;

uint pcg(uint v) {
  uint state = v * 747796405u + 2891336453u;
  uint word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
  return (word >> 22u) ^ word;
}
ivec2 imod2(ivec2 a, ivec2 p) { return ((a % p) + p) % p; }
float imodf(float a, float p) { return a - p * floor(a / p); }
/** Hash of an integer lattice point + seed → [0,1). */
float h1(ivec2 p, float seed) {
  uint s = uint(int(seed * 131.0) + 7919);
  return float(pcg(uint(p.x) + pcg(uint(p.y) + pcg(s)))) * (1.0 / 4294967295.0);
}
vec2 h2(ivec2 p, float seed) { return vec2(h1(p, seed), h1(p, seed + 17.31)); }
float hf(float x, float seed) { return h1(ivec2(int(x), 0), seed); }

/** Periodic value noise. p in lattice units; per = integer period. */
float vnoise(vec2 p, vec2 per, float seed) {
  vec2 i = floor(p); vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  ivec2 P = ivec2(per); ivec2 ii = ivec2(i);
  float a = h1(imod2(ii, P), seed);
  float b = h1(imod2(ii + ivec2(1, 0), P), seed);
  float c = h1(imod2(ii + ivec2(0, 1), P), seed);
  float d = h1(imod2(ii + ivec2(1, 1), P), seed);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
/** Periodic gradient (Perlin) noise, ~[0,1]. */
float gnoise(vec2 p, vec2 per, float seed) {
  vec2 i = floor(p); vec2 f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  ivec2 P = ivec2(per); ivec2 ii = ivec2(i);
  float a0 = h1(imod2(ii, P), seed) * TAU;
  float a1 = h1(imod2(ii + ivec2(1, 0), P), seed) * TAU;
  float a2 = h1(imod2(ii + ivec2(0, 1), P), seed) * TAU;
  float a3 = h1(imod2(ii + ivec2(1, 1), P), seed) * TAU;
  float a = dot(vec2(cos(a0), sin(a0)), f);
  float b = dot(vec2(cos(a1), sin(a1)), f - vec2(1.0, 0.0));
  float c = dot(vec2(cos(a2), sin(a2)), f - vec2(0.0, 1.0));
  float d = dot(vec2(cos(a3), sin(a3)), f - vec2(1.0, 1.0));
  return 0.5 + 0.75 * mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
/** fBm of gradient noise; freq = integer cells per tile at the first octave (per axis). */
float fbm(vec2 uv, vec2 freq, int oct, float seed) {
  float s = 0.0, a = 0.5, n = 0.0;
  vec2 f = freq;
  for (int i = 0; i < 8; i++) {
    if (i >= oct) break;
    s += a * gnoise(uv * f, f, seed + float(i) * 7.13);
    n += a; a *= 0.5; f *= 2.0;
  }
  return s / n;
}
float fbm1(vec2 uv, float freq, int oct, float seed) { return fbm(uv, vec2(freq), oct, seed); }
/** Ridged multifractal (sharp creases / cracks near 1). */
float ridged(vec2 uv, vec2 freq, int oct, float seed) {
  float s = 0.0, a = 0.5, n = 0.0;
  vec2 f = freq;
  for (int i = 0; i < 6; i++) {
    if (i >= oct) break;
    float r = 1.0 - abs(gnoise(uv * f, f, seed + float(i) * 3.7) * 2.0 - 1.0);
    s += a * r * r; n += a; a *= 0.5; f *= 2.0;
  }
  return s / n;
}
/** Value-noise fBm (cheaper, blockier) for fibres/streaks. */
float vfbm(vec2 uv, vec2 freq, int oct, float seed) {
  float s = 0.0, a = 0.5, n = 0.0;
  vec2 f = freq;
  for (int i = 0; i < 6; i++) {
    if (i >= oct) break;
    s += a * vnoise(uv * f, f, seed + float(i) * 5.1);
    n += a; a *= 0.5; f *= 2.0;
  }
  return s / n;
}

/** Periodic Worley: x=F1, y=F2, z=cell hash, w=second-cell hash. */
vec4 worley(vec2 uv, vec2 freq, float jitter, float seed) {
  vec2 p = uv * freq; vec2 i = floor(p); vec2 f = fract(p);
  ivec2 P = ivec2(freq);
  float F1 = 9.0, F2 = 9.0; float id1 = 0.0, id2 = 0.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    ivec2 c = imod2(ivec2(i) + ivec2(x, y), P);
    vec2 o = 0.5 + (h2(c, seed) - 0.5) * jitter;
    vec2 d = vec2(float(x), float(y)) + o - f;
    float dd = dot(d, d);
    if (dd < F1) { F2 = F1; id2 = id1; F1 = dd; id1 = h1(c, seed + 3.0); }
    else if (dd < F2) { F2 = dd; id2 = h1(c, seed + 3.0); }
  }
  return vec4(sqrt(F1), sqrt(F2), id1, id2);
}

/**
 * Periodic Voronoi with exact distance to the cell border (iq). Returns
 * x = border distance (lattice units), y = cell hash, z = distance to the cell point,
 * and writes the vector from the pixel to its cell point into 'toPt'.
 */
vec3 voronoiEdge(vec2 uv, vec2 freq, float jitter, float seed, out vec2 toPt) {
  vec2 p = uv * freq; vec2 i = floor(p); vec2 f = fract(p);
  ivec2 P = ivec2(freq);
  vec2 mr = vec2(0.0); ivec2 mb = ivec2(0); float md = 9.0; float id = 0.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    ivec2 b = ivec2(x, y);
    ivec2 c = imod2(ivec2(i) + b, P);
    vec2 o = 0.5 + (h2(c, seed) - 0.5) * jitter;
    vec2 r = vec2(b) + o - f;
    float d = dot(r, r);
    if (d < md) { md = d; mr = r; mb = b; id = h1(c, seed + 3.0); }
  }
  float ed = 9.0;
  for (int y = -2; y <= 2; y++) for (int x = -2; x <= 2; x++) {
    ivec2 b = mb + ivec2(x, y);
    ivec2 c = imod2(ivec2(i) + b, P);
    vec2 o = 0.5 + (h2(c, seed) - 0.5) * jitter;
    vec2 r = vec2(b) + o - f;
    vec2 dr = r - mr;
    if (dot(dr, dr) > 1e-5) ed = min(ed, dot(0.5 * (mr + r), normalize(dr)));
  }
  toPt = mr;
  return vec3(ed, id, sqrt(md));
}

/**
 * Ashlar / brick layout with jittered row heights and joint positions (all periodic).
 * Returns x,y = local coords in the block [0,1], z = distance to the nearest joint in tile units,
 * w = block hash; id = integer block coords.
 */
vec4 ashlar(vec2 uv, float rows, float cols, float rowJit, float colJit, float seed, out vec2 id, out vec2 bsize) {
  float fy = uv.y * rows;
  float k = floor(fy);
  float b0 = k + (hf(imodf(k, rows), seed) - 0.5) * rowJit;
  float b1 = k + 1.0 + (hf(imodf(k + 1.0, rows), seed) - 0.5) * rowJit;
  if (fy < b0) { k -= 1.0; b1 = b0; b0 = k + (hf(imodf(k, rows), seed) - 0.5) * rowJit; }
  else if (fy >= b1) { k += 1.0; b0 = b1; b1 = k + 1.0 + (hf(imodf(k + 1.0, rows), seed) - 0.5) * rowJit; }
  float kr = imodf(k, rows);
  float off = hf(kr, seed + 11.0);
  float fx = uv.x * cols + off;
  float j = floor(fx);
  #define JX(jj) ((h1(ivec2(int(imodf(jj, cols)), int(kr)), seed + 23.0) - 0.5) * colJit)
  float a0 = j + JX(j), a1 = j + 1.0 + JX(j + 1.0);
  if (fx < a0) { j -= 1.0; a1 = a0; a0 = j + JX(j); }
  else if (fx >= a1) { j += 1.0; a0 = a1; a1 = j + 1.0 + JX(j + 1.0); }
  #undef JX
  vec2 local = vec2((fx - a0) / (a1 - a0), (fy - b0) / (b1 - b0));
  float ex = min(fx - a0, a1 - fx) / cols;
  float ey = min(fy - b0, b1 - fy) / rows;
  id = vec2(imodf(j, cols), kr);
  bsize = vec2((a1 - a0) / cols, (b1 - b0) / rows);
  return vec4(local, min(ex, ey), h1(ivec2(id), seed + 5.0));
}

/**
 * Periodic scratches: thin, finite streaks along integer direction 'a' (b ~ perpendicular, also
 * integer). along/across are integer frequencies; across >> along gives long thin lines.
 */
float scratches(vec2 uv, vec2 a, vec2 b, float along, float across, float density, float seed) {
  vec2 q = vec2(dot(uv, a), dot(uv, b));
  float n = gnoise(vec2(q.x * along, q.y * across), vec2(along, across), seed);
  float acrossS = max(1.0, floor(across * 0.25));
  float seg = gnoise(vec2(q.x * along * 2.0, q.y * acrossS), vec2(along * 2.0, acrossS), seed + 9.0);
  return smoothstep(1.0 - density, 1.0 - density * 0.45, n) * smoothstep(0.48, 0.62, seg);
}

vec3 lum3(vec3 c) { float l = dot(c, vec3(0.2126, 0.7152, 0.0722)); return vec3(l); }
float sat01(float x) { return clamp(x, 0.0, 1.0); }
`;

/** Common uniforms + outputs for generator programs (MRT: albedo+alpha, height/rough/metal/emissive). */
export const GLSL_GEN_HEADER = /* glsl */ `
uniform int uKind;
uniform float uSeed;
uniform vec3 uC0, uC1, uC2, uC3;
uniform vec4 uP0, uP1;
uniform sampler2D uMask;
uniform float uHasMask;
in vec2 vUv;
layout(location = 0) out vec4 outA;
layout(location = 1) out vec4 outB;

struct S { vec3 alb; float h; float rough; float metal; float emis; float alpha; };
S mk(vec3 alb, float h, float r, float m) { S s; s.alb = alb; s.h = h; s.rough = r; s.metal = m; s.emis = 0.0; s.alpha = 1.0; return s; }
void emit(S s) {
  outA = vec4(max(s.alb, vec3(0.0)), s.alpha);
  outB = vec4(s.h, clamp(s.rough, 0.02, 1.0), clamp(s.metal, 0.0, 1.0), clamp(s.emis, 0.0, 1.0));
}
`;

export const GLSL_FULLSCREEN_VERT = /* glsl */ `
precision highp float;
in vec3 position;
out vec2 vUv;
void main() { vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;
