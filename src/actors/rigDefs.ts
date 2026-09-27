/**
 * CONTRACT — humanoid rig used by every character.
 *
 * Conventions (model space, metres):
 *  - Character faces +Z. Up is +Y. The character's RIGHT side is -X, LEFT side is +X.
 *  - `root` sits on the ground between the feet and carries position + yaw.
 *  - Bone rest rotations are identity. Limbs hang straight down (-Y) at rest; spine bones point up.
 *  - A bone's children are offset along the bone, so attach geometry that spans from the bone
 *    origin to its child's offset (e.g. upper arm geometry spans y ∈ [0, -0.29]).
 *  - Rotation sign cheat-sheet (Euler XYZ, radians):
 *      spine/chest/neck/head:  +X bends forward, +Y twists toward the character's left, +Z leans to the character's right
 *      limbs hanging down:     -X swings forward (hip flexion / arm raise forward), +X swings back
 *      arm abduction:          left arm +Z, right arm -Z
 *      knee flexion:           +X ;  elbow flexion: -X (forearm comes forward/up)
 *    Rotation about Z on a +Y bone moves its tip toward -X (the character's right) for positive angles.
 */
export const BONES = [
  'hips', 'spine', 'chest', 'neck', 'head',
  'shoulderL', 'upperArmL', 'forearmL', 'handL',
  'shoulderR', 'upperArmR', 'forearmR', 'handR',
  'thighL', 'shinL', 'footL',
  'thighR', 'shinR', 'footR',
] as const;
export type BoneName = (typeof BONES)[number];

export const BONE_PARENT: Record<BoneName, BoneName | 'root'> = {
  hips: 'root', spine: 'hips', chest: 'spine', neck: 'chest', head: 'neck',
  shoulderL: 'chest', upperArmL: 'shoulderL', forearmL: 'upperArmL', handL: 'forearmL',
  shoulderR: 'chest', upperArmR: 'shoulderR', forearmR: 'upperArmR', handR: 'forearmR',
  thighL: 'hips', shinL: 'thighL', footL: 'shinL',
  thighR: 'hips', shinR: 'thighR', footR: 'shinR',
};

/** Rest offsets from parent for a 1.80 m reference human. Scale via `RigProportions`. */
export const BONE_OFFSET: Record<BoneName, [number, number, number]> = {
  hips: [0, 0.98, 0],
  spine: [0, 0.10, 0],
  chest: [0, 0.20, 0],
  neck: [0, 0.25, 0],
  head: [0, 0.10, 0],
  shoulderL: [0.06, 0.20, 0],
  upperArmL: [0.13, -0.02, 0],
  forearmL: [0, -0.29, 0],
  handL: [0, -0.26, 0],
  shoulderR: [-0.06, 0.20, 0],
  upperArmR: [-0.13, -0.02, 0],
  forearmR: [0, -0.29, 0],
  handR: [0, -0.26, 0],
  thighL: [0.10, -0.06, 0],
  shinL: [0, -0.44, 0],
  footL: [0, -0.43, 0],
  thighR: [-0.10, -0.06, 0],
  shinR: [0, -0.44, 0],
  footR: [0, -0.43, 0],
};

/** Length of each bone's own segment (distance to its main child), used by model builders. */
export const BONE_LENGTH: Partial<Record<BoneName, number>> = {
  spine: 0.20, chest: 0.25, neck: 0.10, head: 0.24,
  upperArmL: 0.29, forearmL: 0.26, handL: 0.09,
  upperArmR: 0.29, forearmR: 0.26, handR: 0.09,
  thighL: 0.44, shinL: 0.43, footL: 0.22,
  thighR: 0.44, shinR: 0.43, footR: 0.22,
};

export interface RigProportions {
  height: number;    // overall scale factor (1 = 1.80 m)
  bulk: number;      // girth multiplier for geometry (1 = average)
  shoulder: number;  // shoulder width multiplier
}

/**
 * Sockets (child Object3Ds created by the Rig):
 *  - `weaponR`  child of handR. Weapon local frame: grip centre at origin, blade/shaft along +Y,
 *               edge facing +Z. Rig orients the socket so +Y points forward out of the fist.
 *  - `weaponL`  child of handL, same convention (catalysts, dirks, bows).
 *  - `shieldL`  child of forearmL. Shield local frame: centre of the face at origin, face normal +Z
 *               (outward, away from the arm), top of the shield +Y.
 *  - `cloak`    child of chest at the back of the shoulders; cloth hangs toward -Z/-Y.
 *  - `back`     child of chest, for sheathed/stowed items.
 */
export const SOCKETS = ['weaponR', 'weaponL', 'shieldL', 'cloak', 'back'] as const;
export type SocketName = (typeof SOCKETS)[number];
