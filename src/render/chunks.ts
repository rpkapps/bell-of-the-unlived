/**
 * Global shader-chunk patches against temporal instability (installed once on import, before
 * any program compiles — like the height fog in fog.ts):
 *
 *  - Specular anti-aliasing: normal-mapped, low-roughness surfaces (wet stone, polished metal)
 *    sparkle and crawl when normal detail is smaller than a pixel. The roughness is widened by the
 *    screen-space variance of the shading normal (Kaplanyan/Tokuyoshi), so the highlight is
 *    averaged over the pixel instead of aliasing from frame to frame.
 *  - Shadow edge fade: the sun's shadow map covers a box that follows the player. Without a fade,
 *    objects crossing its border gain/lose their shadows abruptly as the player walks; the last
 *    12 % of the box now fades to unshadowed.
 */
import * as THREE from 'three';

const ROUGHNESS_LINE = 'material.roughness = min( material.roughness, 1.0 );';
const SPECULAR_AA = /* glsl */ `material.roughness = min( material.roughness, 1.0 );
{
	// specular AA: alpha^2 += 2 * variance of the shading normal over the pixel footprint
	vec3 saaDx = dFdx( normal ), saaDy = dFdy( normal );
	float saaVar = 0.25 * ( dot( saaDx, saaDx ) + dot( saaDy, saaDy ) );
	float saaA2 = pow2( pow2( material.roughness ) ) + min( 2.0 * saaVar, 0.18 );
	material.roughness = min( sqrt( sqrt( saaA2 ) ), 1.0 );
}`;

const SHADOW_RETURN = 'return mix( 1.0, shadow, shadowIntensity );';
const SHADOW_FADE = /* glsl */ `{
			// fade out toward the border of the (player-following) shadow map
			vec2 sfe = abs( shadowCoord.xy * 2.0 - 1.0 );
			shadow = mix( shadow, 1.0, smoothstep( 0.88, 1.0, max( sfe.x, sfe.y ) ) );
		}
		return mix( 1.0, shadow, shadowIntensity );`;

let installed = false;
export function installChunkPatches(): void {
  if (installed) return;
  installed = true;
  const chunks = THREE.ShaderChunk as unknown as Record<string, string>;
  const phys = chunks.lights_physical_fragment;
  if (phys.includes(ROUGHNESS_LINE)) chunks.lights_physical_fragment = phys.replace(ROUGHNESS_LINE, SPECULAR_AA);
  // first occurrence = getShadow() for directional/spot maps (the point-shadow one follows)
  const sh = chunks.shadowmap_pars_fragment;
  const i = sh.indexOf(SHADOW_RETURN);
  if (i >= 0) chunks.shadowmap_pars_fragment = sh.slice(0, i) + SHADOW_FADE + sh.slice(i + SHADOW_RETURN.length);
}
installChunkPatches();
