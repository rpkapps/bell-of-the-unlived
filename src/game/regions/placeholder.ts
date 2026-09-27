/** A minimal stand-in region (flat stone ground + its Stillbells) used until a region's real build lands. */
import * as THREE from 'three';
import type { RegionModule } from './catalog';
import { regionInfo } from './catalog';
import type { LevelContext, RegionLayout } from '../../world/levelTypes';
import { RegionBase } from './RegionBase';
import { getMaterial } from '../../render/materials';

export function placeholderRegion(id: string): RegionModule {
  return {
    build(ctx: LevelContext): RegionLayout {
      const info = regionInfo(id)!;
      const g = new THREE.Mesh(new THREE.BoxGeometry(80, 1, 80), getMaterial('flagstone'));
      g.position.y = -0.5; g.receiveShadow = true;
      ctx.scene.add(g);
      ctx.collision.addBox([0, -0.5, 0], [80, 1, 80]);
      const stillbells = info.bells.map((b, i) => {
        const pos = new THREE.Vector3(-10 + i * 10, 0, 0);
        const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.3, 0.4, 12), getMaterial('bronze_bell'));
        bell.position.set(pos.x, 1.4, pos.z - 1);
        ctx.scene.add(bell);
        const light = new THREE.PointLight(0xffd9a0, 3, 8);
        light.position.set(pos.x, 1.8, pos.z - 1);
        ctx.scene.add(light);
        return { id: b.id, name: b.name, anchor: { pos, yaw: Math.PI }, bell, light };
      });
      return {
        playerStart: stillbells[0].anchor, stillbells, enemies: [], zones: [], tollPosts: [], arenas: [],
        anchors: {}, pieces: {}, triggers: {}, killY: -20, update: () => {},
      };
    },
    create(game, session, layout) {
      return new (class extends RegionBase { protected setup() {} })(game, session, layout as RegionLayout, regionInfo(id)!);
    },
  };
}
