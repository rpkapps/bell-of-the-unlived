/**
 * Custom post passes for the composer chain:
 *   ScenePass       renders the scene into its own HDR target with a depth texture (shared by GTAO
 *                   and motion blur), records draw stats, then hands the colour to the chain.
 *   MotionBlurPass  camera motion blur: per-pixel velocity reconstructed from depth + previous
 *                   view-projection; 8 taps, near-field (player) protected. Scene-linear HDR.
 *   GradePass       exposure, cool-shadow/warm-highlight split tone, log contrast, saturation,
 *                   vignette, low-health desaturation + red-bronze pulse, memory sepia, flash,
 *                   film grain. Scene-linear HDR in → HDR out (tone mapping happens in OutputPass).
 */
import * as THREE from 'three';
import { Pass, FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

const COPY_VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }
`;

export class ScenePass extends Pass {
  scene: THREE.Scene;
  camera: THREE.Camera;
  readonly target: THREE.WebGLRenderTarget;
  readonly stats = { drawCalls: 0, triangles: 0 };
  private readonly quad: FullScreenQuad;
  private readonly copy: THREE.ShaderMaterial;

  constructor(scene: THREE.Scene, camera: THREE.Camera) {
    super();
    this.scene = scene;
    this.camera = camera;
    const depth = new THREE.DepthTexture(1, 1);
    depth.type = THREE.UnsignedIntType;
    this.target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthTexture: depth, samples: 0 });
    this.target.texture.name = 'ScenePass.color';
    this.copy = new THREE.ShaderMaterial({
      uniforms: { tDiffuse: { value: null } },
      vertexShader: COPY_VERT,
      fragmentShader: 'uniform sampler2D tDiffuse; varying vec2 vUv; void main(){ gl_FragColor = texture2D( tDiffuse, vUv ); }',
      depthTest: false, depthWrite: false,
    });
    this.quad = new FullScreenQuad(this.copy);
    this.needsSwap = true;
  }

  get depthTexture(): THREE.DepthTexture { return this.target.depthTexture as THREE.DepthTexture; }

  override setSize(w: number, h: number): void { this.target.setSize(w, h); }

  override render(renderer: THREE.WebGLRenderer, writeBuffer: THREE.WebGLRenderTarget): void {
    renderer.setRenderTarget(this.target);
    renderer.clear(true, true, false);
    renderer.render(this.scene, this.camera);
    this.stats.drawCalls = renderer.info.render.calls;
    this.stats.triangles = renderer.info.render.triangles;
    this.copy.uniforms.tDiffuse.value = this.target.texture;
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    this.quad.render(renderer);
  }

  override dispose(): void { this.target.dispose(); this.copy.dispose(); this.quad.dispose(); }
}

// ---------------------------------------------------------------------------------------------
export class MotionBlurPass extends ShaderPass {
  private readonly prevViewProj = new THREE.Matrix4();
  private readonly curViewProj = new THREE.Matrix4();
  private hasPrev = false;

  constructor(depth: THREE.Texture) {
    super({
      uniforms: {
        tDiffuse: { value: null }, tDepth: { value: depth },
        uInvViewProj: { value: new THREE.Matrix4() }, uPrevViewProj: { value: new THREE.Matrix4() },
        uStrength: { value: 0.5 }, uNear: { value: 0.1 }, uFar: { value: 1000 },
      },
      vertexShader: COPY_VERT,
      fragmentShader: /* glsl */ `
        uniform sampler2D tDiffuse;
        uniform sampler2D tDepth;
        uniform mat4 uInvViewProj;
        uniform mat4 uPrevViewProj;
        uniform float uStrength, uNear, uFar;
        varying vec2 vUv;
        float viewZ( float d ) { float z = d * 2.0 - 1.0; return ( 2.0 * uNear * uFar ) / ( uFar + uNear - z * ( uFar - uNear ) ); }
        void main() {
          float d = texture2D( tDepth, vUv ).r;
          vec4 ndc = vec4( vUv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0 );
          vec4 wp = uInvViewProj * ndc; wp /= wp.w;
          vec4 prev = uPrevViewProj * wp;
          vec2 puv = prev.xy / prev.w * 0.5 + 0.5;
          vec2 vel = ( vUv - puv ) * uStrength;
          // protect the near field (the player sits ~3-6 m from the camera and moves with it)
          vel *= smoothstep( 5.0, 12.0, viewZ( d ) );
          float len = length( vel );
          if ( len > 0.035 ) vel *= 0.035 / len;
          vec4 c = texture2D( tDiffuse, vUv );
          if ( len < 0.0008 ) { gl_FragColor = c; return; }
          vec3 acc = c.rgb; float w = 1.0;
          for ( int i = 1; i <= 4; i++ ) {
            float t = float( i ) / 4.0 * 0.5;
            acc += texture2D( tDiffuse, vUv + vel * t ).rgb;
            acc += texture2D( tDiffuse, vUv - vel * t ).rgb;
            w += 2.0;
          }
          gl_FragColor = vec4( acc / w, c.a );
        }`,
    });
  }

  /** Call once per frame before rendering, with the camera about to be rendered. */
  updateCamera(camera: THREE.PerspectiveCamera): void {
    camera.updateMatrixWorld();
    this.curViewProj.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    if (!this.hasPrev) { this.prevViewProj.copy(this.curViewProj); this.hasPrev = true; }
    const u = this.uniforms as Record<string, THREE.IUniform>;
    (u.uInvViewProj.value as THREE.Matrix4).copy(this.curViewProj).invert();
    (u.uPrevViewProj.value as THREE.Matrix4).copy(this.prevViewProj);
    u.uNear.value = camera.near; u.uFar.value = camera.far;
  }
  /** Call once per frame after rendering. */
  endFrame(): void { this.prevViewProj.copy(this.curViewProj); }
  /** Forget the previous frame (after a camera cut / teleport). */
  reset(): void { this.hasPrev = false; }
}

// ---------------------------------------------------------------------------------------------
export class GradePass extends ShaderPass {
  constructor() {
    super({
      uniforms: {
        tDiffuse: { value: null },
        uExposure: { value: 1 },
        uShadowTint: { value: new THREE.Color(0.92, 0.97, 1.06) },
        uHighlightTint: { value: new THREE.Color(1.05, 1.0, 0.93) },
        uContrast: { value: 1.08 },
        uSaturation: { value: 0.92 },
        uVignette: { value: 0.35 },
        uLowHealth: { value: 0 },
        uPulse: { value: 0 },
        uMemory: { value: 0 },
        uFlash: { value: 0 },
        uFlashColor: { value: new THREE.Color(1, 1, 1) },
        uGrain: { value: 0 },
        uTime: { value: 0 },
        uAspect: { value: 16 / 9 },
      },
      vertexShader: COPY_VERT,
      fragmentShader: /* glsl */ `
        uniform sampler2D tDiffuse;
        uniform float uExposure, uContrast, uSaturation, uVignette, uLowHealth, uPulse, uMemory, uFlash, uGrain, uTime, uAspect;
        uniform vec3 uShadowTint, uHighlightTint, uFlashColor;
        varying vec2 vUv;
        float luma( vec3 c ) { return dot( c, vec3( 0.2126, 0.7152, 0.0722 ) ); }
        float hash( vec2 p ) { p = fract( p * vec2( 443.897, 441.423 ) ); p += dot( p, p.yx + 19.19 ); return fract( ( p.x + p.y ) * p.x ); }
        void main() {
          vec3 c = max( texture2D( tDiffuse, vUv ).rgb, vec3( 0.0 ) ) * uExposure;
          // split tone by log-luminance: cool shadows, warm highlights
          float l = luma( c );
          float zone = smoothstep( -5.5, 1.0, log2( l + 1e-5 ) + 2.47 );
          c *= mix( uShadowTint, uHighlightTint, zone );
          // contrast around middle grey in log space
          c = 0.18 * pow( max( c, vec3( 1e-6 ) ) / 0.18, vec3( uContrast ) );
          l = luma( c );
          float sat = uSaturation * ( 1.0 - 0.75 * uLowHealth );
          c = max( mix( vec3( l ), c, sat ), vec3( 0.0 ) );
          // memory: warm sepia wash with lifted blacks
          vec3 sep = vec3( l ) * vec3( 1.12, 0.96, 0.72 ) + vec3( 0.012, 0.008, 0.004 );
          c = mix( c, sep, uMemory * 0.85 );
          // vignette
          vec2 d = ( vUv - 0.5 ) * vec2( uAspect, 1.0 );
          float r = length( d ) / length( vec2( uAspect, 1.0 ) * 0.5 );
          float vig = smoothstep( 0.35, 1.05, r );
          c *= 1.0 - uVignette * vig * vig;
          // low health: red-bronze edge pulse
          float lh = uLowHealth * ( 0.7 + 0.3 * uPulse ) * smoothstep( 0.3, 1.0, r );
          c = mix( c, c * vec3( 0.45, 0.14, 0.08 ) + vec3( 0.03, 0.006, 0.002 ), clamp( lh, 0.0, 0.85 ) );
          // flash
          c += uFlashColor * uFlash;
          // film grain (multiplicative, luminance aware). Kept faint: per-pixel noise that changes
          // every frame reads as the image flickering, most of all in the dark scenes this game has.
          float n = hash( gl_FragCoord.xy + fract( uTime * 13.7 ) * 311.0 ) - 0.5;
          c *= 1.0 + n * uGrain * ( 0.7 + 0.5 * smoothstep( 0.2, 0.0, l ) );
          gl_FragColor = vec4( c, 1.0 );
        }`,
    });
  }
}
