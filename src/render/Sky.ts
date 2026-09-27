/**
 * Sky: a camera-centred shader dome (gradient, horizon glow toward the key light, two drifting
 * procedural cloud layers, optional storm flashes) plus two rings of distant city silhouettes —
 * spires, bell towers, gables, a broken keep — on cylindrical cards at the horizon, hazed into the
 * fog colour, with a few warm lit windows on the nearer ring.
 *
 * Everything renders first (renderOrder < 0) without depth, so it costs one dome + two cards.
 * `captureScene` holds twins of the meshes (shared materials) for PMREM environment capture.
 */
import * as THREE from 'three';
import { Rng } from '../core/rng';
import { getNoiseTexture } from './textures';
import { makeCanvas } from './heraldry';

export interface SkyState {
  zenith: THREE.Color;
  horizon: THREE.Color;
  ground: THREE.Color;
  glow: THREE.Color;
  /** Horizontal direction of the glow (world, y ignored). */
  glowDir: THREE.Vector3;
  glowStrength: number;
  glowPower: number;
  cloudColor: THREE.Color;
  cloudLit: THREE.Color;
  cloudCover: number;
  cloudOpacity: number;
  cloudSpeed: number;
  skyline: number;
  skylineColor: THREE.Color;
  skylineWindows: number;
  /** Colour the silhouettes' feet dissolve into (the fog colour). */
  haze: THREE.Color;
  flash: number;
}

const DOME_VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = position;
  vec4 wp = modelMatrix * vec4( position, 1.0 );
  gl_Position = projectionMatrix * viewMatrix * wp;
  gl_Position.z = gl_Position.w; // far plane
}
`;
const DOME_FRAG = /* glsl */ `
uniform vec3 uZenith, uHorizon, uGround, uGlow, uGlowDir, uCloudCol, uCloudLit;
uniform float uGlowStrength, uGlowPower, uCover, uCloudOpacity, uCloudSpeed, uTime, uFlash;
uniform sampler2D uNoise;
varying vec3 vDir;
void main() {
  vec3 d = normalize( vDir );
  float h = d.y;
  float t = pow( 1.0 - clamp( h, 0.0, 1.0 ), 3.2 );
  vec3 col = mix( uZenith, uHorizon, t );
  col = mix( col, uGround, smoothstep( 0.0, -0.1, h ) );
  vec2 hd = normalize( d.xz + vec2( 1e-5 ) );
  float g = max( dot( hd, normalize( uGlowDir.xz + vec2( 1e-5 ) ) ), 0.0 );
  float glowH = exp( - max( h, 0.0 ) * 5.0 ) * smoothstep( -0.12, 0.02, h );
  col += uGlow * pow( g, uGlowPower ) * glowH * uGlowStrength;
  col += uGlow * 0.12 * glowH * uGlowStrength; // faint all-round horizon band
  float cl = 0.0;
  if ( h > -0.05 ) {
    vec2 p = d.xz / ( max( h, 0.0 ) + 0.16 );
    vec2 wind = vec2( 1.0, 0.37 ) * uTime * uCloudSpeed;
    float n1 = texture2D( uNoise, p * 0.05 + wind * 0.004 ).r;
    float n2 = texture2D( uNoise, p * 0.13 + wind * 0.009 + n1 * 0.15 ).g;
    float n3 = texture2D( uNoise, p * 0.41 + wind * 0.02 ).b;
    float dens = n1 * 0.62 + n2 * 0.28 + n3 * 0.14;
    cl = smoothstep( 1.0 - uCover - 0.05, 1.0 - uCover + 0.32, dens );
    float lit = clamp( pow( g, 2.5 ) * 0.7 + ( n2 - 0.45 ) * 0.8 + ( 1.0 - dens ) * 0.4, 0.0, 1.0 );
    vec3 cc = mix( uCloudCol, uCloudLit, lit );
    // thin high streaks
    float hi = smoothstep( 0.55, 0.85, texture2D( uNoise, vec2( p.x * 0.03, p.y * 0.11 ) + wind * 0.002 ).a ) * 0.35;
    float fade = smoothstep( -0.03, 0.22, h );
    col = mix( col, cc, clamp( cl * uCloudOpacity, 0.0, 1.0 ) * fade );
    col = mix( col, uCloudLit, hi * fade * uCloudOpacity * ( 1.0 - cl ) );
  }
  col += uFlash * vec3( 0.55, 0.6, 0.75 ) * ( 0.25 + 0.75 * cl ) * smoothstep( -0.05, 0.3, h );
  gl_FragColor = vec4( col, 1.0 );
}
`;

const RING_VERT = /* glsl */ `
varying vec2 vUv;
varying float vH;
void main() {
  vUv = uv;
  vH = position.y;
  vec4 wp = modelMatrix * vec4( position, 1.0 );
  gl_Position = projectionMatrix * viewMatrix * wp;
  gl_Position.z = gl_Position.w * 0.99999;
}
`;
const RING_FRAG = /* glsl */ `
uniform sampler2D uMap;
uniform vec3 uColor, uHaze, uWin;
uniform float uOpacity, uRepeat, uFar, uWindows, uTime;
varying vec2 vUv;
varying float vH;
void main() {
  vec4 s = texture2D( uMap, vec2( vUv.x * uRepeat, vUv.y ) );
  if ( s.a < 0.5 || uOpacity < 0.01 ) discard;
  // haze thickens toward the silhouettes' feet (height fog) and with distance (far ring)
  float feet = 1.0 - smoothstep( 0.0, 0.55, vUv.y );
  float haze = clamp( 0.35 + uFar * 0.35 + feet * 0.7 - vUv.y * 0.15, 0.0, 0.97 );
  vec3 c = mix( uColor, uHaze, haze );
  float flick = 0.8 + 0.2 * sin( uTime * 1.3 + vUv.x * 431.0 );
  c += uWin * s.g * uWindows * ( 1.0 - haze * 0.8 ) * flick;
  gl_FragColor = vec4( mix( uHaze, c, uOpacity ), 1.0 );
}
`;

/** Draw a wrapping skyline (alpha = silhouette, green = lit windows). */
function skylineCanvas(seed: number, w: number, h: number, density: number): HTMLCanvasElement | OffscreenCanvas {
  const { canvas, ctx } = makeCanvas(w, h);
  const layout = new Rng(seed);
  const base = h * 0.98;
  const fill = (path: () => void) => { ctx.fillStyle = 'rgba(255,0,0,1)'; ctx.beginPath(); path(); ctx.fill(); };
  const win = (x: number, y: number, ww: number, hh: number) => { ctx.fillStyle = 'rgba(255,255,0,1)'; ctx.fillRect(x, y, ww, hh); };
  // Each element draws from its own RNG so wrapped copies (x ± w) are identical.
  const building = (x: number, rng: Rng) => {
    const bw = rng.range(18, 60), bh = rng.range(0.12, 0.3) * h;
    const roof = rng.next(), pitch = rng.range(0.35, 0.8);
    fill(() => {
      ctx.moveTo(x, base); ctx.lineTo(x, base - bh);
      if (roof < 0.6) ctx.lineTo(x + bw / 2, base - bh - bw * pitch);
      else if (roof < 0.8) { ctx.lineTo(x + bw * 0.2, base - bh - bw * 0.25); ctx.lineTo(x + bw * 0.8, base - bh - bw * 0.25); }
      ctx.lineTo(x + bw, base - bh); ctx.lineTo(x + bw, base); ctx.closePath();
    });
    if (rng.chance(0.5)) { const cx = x + bw * rng.range(0.1, 0.8); fill(() => { ctx.rect(cx, base - bh - bw * 0.5, 3, bw * 0.3); }); }
    for (let i = 0; i < 3; i++) { const on = rng.chance(0.35), wx = x + rng.range(0.1, 0.85) * bw, wy = base - rng.range(0.2, 0.9) * bh; if (on) win(wx, wy, 2, 3); }
  };
  const tower = (x: number, rng: Rng) => {
    const tw = rng.range(10, 26), th = rng.range(0.35, 0.62) * h;
    fill(() => { ctx.rect(x, base - th, tw, th); });
    const top = rng.next(), spire = rng.range(0.8, 2.4);
    if (top < 0.5) {
      fill(() => { ctx.moveTo(x - 2, base - th); ctx.lineTo(x + tw / 2, base - th - spire * tw * 2); ctx.lineTo(x + tw + 2, base - th); ctx.closePath(); });
      fill(() => { ctx.moveTo(x - 3, base - th); ctx.lineTo(x - 1.5, base - th - tw * 0.8); ctx.lineTo(x, base - th); ctx.closePath(); });
      fill(() => { ctx.moveTo(x + tw, base - th); ctx.lineTo(x + tw + 1.5, base - th - tw * 0.8); ctx.lineTo(x + tw + 3, base - th); ctx.closePath(); });
    } else if (top < 0.8) {
      const m = Math.max(3, Math.round(tw / 5));
      for (let i = 0; i < m; i += 2) fill(() => { ctx.rect(x + (i * tw) / m, base - th - 5, tw / m, 5); });
    } else {
      // bell tower: open belfry with a hanging bell under a pointed cap
      fill(() => { ctx.moveTo(x - 2, base - th); ctx.lineTo(x + tw / 2, base - th - tw * 0.9); ctx.lineTo(x + tw + 2, base - th); ctx.closePath(); });
      ctx.clearRect(x + tw * 0.2, base - th + 4, tw * 0.6, tw * 0.6);
      fill(() => { ctx.moveTo(x + tw * 0.33, base - th + 4 + tw * 0.55); ctx.quadraticCurveTo(x + tw * 0.5, base - th + 2, x + tw * 0.67, base - th + 4 + tw * 0.55); ctx.closePath(); });
    }
    for (let i = 0; i < 2; i++) { const on = rng.chance(0.3), wy = base - rng.range(0.2, 0.8) * th; if (on) win(x + tw * 0.4, wy, 2, 4); }
  };
  const ruin = (x: number, rng: Rng) => {
    const tw = rng.range(20, 40), th = rng.range(0.3, 0.5) * h;
    const jag = Array.from({ length: 6 }, () => rng.range(-0.1, 0.35));
    fill(() => {
      ctx.moveTo(x, base); ctx.lineTo(x, base - th);
      for (let i = 1; i <= 6; i++) ctx.lineTo(x + (tw * i) / 6, base - th + jag[i - 1] * th * (i % 2 ? 1 : 0.4));
      ctx.lineTo(x + tw, base); ctx.closePath();
    });
  };
  let x = 0;
  while (x < w) {
    const r = layout.next();
    const draw = r < 0.55 ? building : r < 0.9 ? tower : ruin;
    const eSeed = Math.floor(layout.next() * 1e9);
    for (const off of [0, -w, w]) draw(x + off, new Rng(eSeed));
    x += layout.range(10, 50) / density;
  }
  // continuous ground band so there is never a gap under the silhouettes
  ctx.fillStyle = 'rgba(255,0,0,1)';
  ctx.fillRect(0, base - h * 0.06, w, h);
  return canvas;
}

export class Sky {
  readonly object = new THREE.Group();
  readonly captureScene = new THREE.Scene();
  readonly state: SkyState;
  private readonly dome: THREE.Mesh;
  private readonly domeMat: THREE.ShaderMaterial;
  private readonly rings: { mesh: THREE.Mesh; mat: THREE.ShaderMaterial; twin: THREE.Mesh }[] = [];
  private readonly domeTwin: THREE.Mesh;
  static readonly RADIUS = 900;

  constructor() {
    this.state = {
      zenith: new THREE.Color(0.08, 0.1, 0.13), horizon: new THREE.Color(0.3, 0.33, 0.36), ground: new THREE.Color(0.1, 0.1, 0.1),
      glow: new THREE.Color(0.5, 0.48, 0.44), glowDir: new THREE.Vector3(1, 0, 0), glowStrength: 1, glowPower: 3,
      cloudColor: new THREE.Color(0.1, 0.11, 0.13), cloudLit: new THREE.Color(0.4, 0.4, 0.42), cloudCover: 0.6, cloudOpacity: 0.9,
      cloudSpeed: 1, skyline: 1, skylineColor: new THREE.Color(0.05, 0.06, 0.07), skylineWindows: 1,
      haze: new THREE.Color(0.25, 0.28, 0.3), flash: 0,
    };
    const noise = getNoiseTexture();
    this.domeMat = new THREE.ShaderMaterial({
      name: 'sky:dome',
      uniforms: {
        uZenith: { value: this.state.zenith }, uHorizon: { value: this.state.horizon }, uGround: { value: this.state.ground },
        uGlow: { value: this.state.glow }, uGlowDir: { value: this.state.glowDir }, uGlowStrength: { value: 1 }, uGlowPower: { value: 3 },
        uCloudCol: { value: this.state.cloudColor }, uCloudLit: { value: this.state.cloudLit }, uCover: { value: 0.6 },
        uCloudOpacity: { value: 0.9 }, uCloudSpeed: { value: 1 }, uTime: { value: 0 }, uFlash: { value: 0 }, uNoise: { value: noise },
      },
      vertexShader: DOME_VERT, fragmentShader: DOME_FRAG,
      side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false,
    });
    const domeGeo = new THREE.SphereGeometry(Sky.RADIUS, 48, 24);
    this.dome = new THREE.Mesh(domeGeo, this.domeMat);
    this.dome.renderOrder = -1000;
    this.dome.frustumCulled = false;
    this.object.add(this.dome);
    this.domeTwin = new THREE.Mesh(domeGeo, this.domeMat);
    this.captureScene.add(this.domeTwin);

    // Skyline rings (near, far)
    const specs = [
      { seed: 5, radius: 620, height: 95, far: 0.0, repeat: 3, density: 1.0 },
      { seed: 9, radius: 820, height: 150, far: 1.0, repeat: 2, density: 0.8 },
    ];
    for (const s of specs.reverse()) {
      const cv = skylineCanvas(s.seed, 2048, 256, s.density);
      const tex = new THREE.CanvasTexture(cv as HTMLCanvasElement);
      tex.wrapS = THREE.RepeatWrapping;
      tex.colorSpace = THREE.NoColorSpace;
      tex.generateMipmaps = true;
      const mat = new THREE.ShaderMaterial({
        name: 'sky:skyline',
        uniforms: {
          uMap: { value: tex }, uColor: { value: this.state.skylineColor }, uHaze: { value: this.state.haze },
          uWin: { value: new THREE.Color(1.0, 0.55, 0.22).multiplyScalar(2.2) }, uOpacity: { value: 1 }, uRepeat: { value: s.repeat },
          uFar: { value: s.far }, uWindows: { value: s.far > 0.5 ? 0 : 1 }, uTime: { value: 0 },
        },
        vertexShader: RING_VERT, fragmentShader: RING_FRAG,
        side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false,
      });
      // open cylinder from slightly below the horizon upward
      const geo = new THREE.CylinderGeometry(s.radius, s.radius, s.height, 96, 1, true);
      geo.translate(0, s.height / 2 - s.height * 0.12, 0);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.renderOrder = -999 + s.far * -0.5;
      mesh.frustumCulled = false;
      this.object.add(mesh);
      const twin = new THREE.Mesh(geo, mat);
      this.captureScene.add(twin);
      this.rings.push({ mesh, mat, twin });
    }
  }

  /** Push `state` into uniforms and follow the camera. */
  update(camera: THREE.Camera, time: number): void {
    const s = this.state, u = this.domeMat.uniforms;
    u.uGlowStrength.value = s.glowStrength;
    u.uGlowPower.value = s.glowPower;
    u.uCover.value = s.cloudCover;
    u.uCloudOpacity.value = s.cloudOpacity;
    u.uCloudSpeed.value = s.cloudSpeed;
    u.uTime.value = time;
    u.uFlash.value = s.flash;
    for (const r of this.rings) {
      r.mat.uniforms.uOpacity.value = s.skyline;
      r.mat.uniforms.uWindows.value = r.mat.uniforms.uFar.value > 0.5 ? 0 : s.skylineWindows;
      r.mat.uniforms.uTime.value = time;
      r.mesh.visible = r.twin.visible = s.skyline > 0.01;
    }
    this.object.position.set(camera.position.x, camera.position.y - 12, camera.position.z);
    this.dome.position.set(0, 12, 0);
  }
}
