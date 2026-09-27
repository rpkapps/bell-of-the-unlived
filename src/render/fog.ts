/**
 * Height fog for every fog-enabled three.js material, installed by patching the global fog
 * shader chunks once (before any program compiles).
 *
 * Fog density falls off exponentially with altitude above `baseHeight`, integrated analytically
 * along the view ray, and starts only after `startDistance` so the player's surroundings stay
 * crisp. The parameters travel in the stock `fogNear` / `fogFar` uniforms (encoded, see
 * `HeightFog.encode`) so no material needs custom uniforms — including other modules' materials.
 *
 * A plain `THREE.Fog` with `far < 1000` still renders as classic linear fog; `FogExp2` is untouched.
 */
import * as THREE from 'three';

const PARS_VERTEX = /* glsl */ `
#ifdef USE_FOG
	varying float vFogDepth;
	varying vec3 vFogWorldPos;
#endif
`;

const VERTEX = /* glsl */ `
#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
	// world position from view space: R^T (mv - t)
	vFogWorldPos = ( vec4( mvPosition.xyz - viewMatrix[ 3 ].xyz, 0.0 ) * viewMatrix ).xyz;
#endif
`;

const PARS_FRAGMENT = /* glsl */ `
#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	varying vec3 vFogWorldPos;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
	/** Height-fog amount (0..1) for a world point seen from cameraPosition. */
	float heightFogFactor( vec3 worldPos, float nearEnc, float farEnc ) {
		float dens = fract( nearEnc ) * 0.1;
		float start = floor( nearEnc );
		float falloff = fract( farEnc );
		float base = floor( farEnc ) - 4096.0;
		vec3 ray = worldPos - cameraPosition;
		float dist = length( ray );
		float eff = max( dist - start, 0.0 );
		float k = falloff * ray.y;
		float line = abs( k ) > 1e-4 ? ( 1.0 - exp( - k ) ) / k : 1.0;
		float amt = dens * exp( clamp( - falloff * ( cameraPosition.y - base ), -30.0, 20.0 ) ) * eff * line;
		return min( 1.0 - exp( - amt ), 0.985 );
	}
#endif
`;

const FRAGMENT = /* glsl */ `
#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = fogFar < 1000.0 ? smoothstep( fogNear, fogFar, vFogDepth ) : heightFogFactor( vFogWorldPos, fogNear, fogFar );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif
`;

let installed = false;
/** Patch the fog chunks (idempotent). Called automatically when this module is imported. */
export function installHeightFog(): void {
  if (installed) return;
  installed = true;
  const chunks = THREE.ShaderChunk as unknown as Record<string, string>;
  chunks.fog_pars_vertex = PARS_VERTEX;
  chunks.fog_vertex = VERTEX;
  chunks.fog_pars_fragment = PARS_FRAGMENT;
  chunks.fog_fragment = FRAGMENT;
}
installHeightFog();

/** GLSL for custom shaders that want the same fog (include after declaring `cameraPosition`). */
export const HEIGHT_FOG_GLSL = PARS_FRAGMENT;

/**
 * Exponential height fog. Set the public fields, then call `encode()` (the renderer does this
 * every frame while blending environments).
 */
export class HeightFog extends THREE.Fog {
  /** Extinction per metre at `baseHeight` (0.002 … 0.09). */
  density: number;
  /** Exponential falloff per metre of altitude (0 = uniform fog; 0.02 … 0.3 typical). */
  heightFalloff: number;
  /** Altitude of the reference density (world Y). */
  baseHeight: number;
  /** Fog-free radius around the camera (metres). */
  startDistance: number;
  readonly isHeightFog = true;

  constructor(color: THREE.ColorRepresentation, density = 0.02, heightFalloff = 0.08, baseHeight = 0, startDistance = 4) {
    super(color, 0, 5000);
    this.density = density;
    this.heightFalloff = heightFalloff;
    this.baseHeight = baseHeight;
    this.startDistance = startDistance;
    this.encode();
  }

  /** Pack parameters into near/far (see the fog chunk decoder). */
  encode(): void {
    const start = Math.max(0, Math.min(2000, Math.floor(this.startDistance)));
    this.near = start + Math.min(0.999, Math.max(0, this.density * 10));
    const base = Math.max(-3000, Math.min(20000, Math.round(this.baseHeight)));
    this.far = base + 4096 + Math.min(0.999, Math.max(0, this.heightFalloff));
  }

  /** CPU mirror of the shader: fog amount for a world point seen from `cam`. */
  factor(p: THREE.Vector3, cam: THREE.Vector3): number {
    const dx = p.x - cam.x, dy = p.y - cam.y, dz = p.z - cam.z;
    const dist = Math.hypot(dx, dy, dz);
    const eff = Math.max(dist - this.startDistance, 0);
    const k = this.heightFalloff * dy;
    const line = Math.abs(k) > 1e-4 ? (1 - Math.exp(-k)) / k : 1;
    const amt = this.density * Math.exp(Math.max(-30, Math.min(20, -this.heightFalloff * (cam.y - this.baseHeight)))) * eff * line;
    return Math.min(1 - Math.exp(-amt), 0.985);
  }
}
