export type Vec3 = {
    x: number;
    y: number;
    z: number;
};
/** 16 numbers, row-major, row vectors (Babylon's `Matrix.m`). */
export type Mat4 = number[];
/** [x, y, z, w] */
export type Quat = [number, number, number, number];
export declare const HAND_IN_ANATOMY: Record<'r' | 'l', Mat4>;
export declare const IDENTITY4: Mat4;
/** `a·b`: a, then b. */
export declare function mat4Multiply(a: Mat4, b: Mat4): Mat4;
/** The inverse (a zero matrix when there is none). */
export declare function mat4Invert(m: Mat4): Mat4;
/** A point through `m`. */
export declare function mat4Point(m: Mat4, p: Vec3): Vec3;
/** Scale, then turn, then move: a Babylon node's local matrix. */
export declare function compose(scale: Vec3, q: Quat, t: Vec3): Mat4;
/** Babylon's `Quaternion.FromEulerAngles`, in degrees. */
export declare function eulerQuaternion(rx: number, ry: number, rz: number): Quat;
/** `v` turned by `q`. */
export declare function quatRotate(q: Quat, v: Vec3): Vec3;
/**
 * A hand's anatomy frame in the world: x along the forearm (elbow to hand),
 * y towards the thumb's side, at the hand. Null when the thumb is in line
 * with the forearm.
 */
export declare function anatomyFrame(hand: Vec3, lowerarm: Vec3, thumb: Vec3): Mat4 | null;
/**
 * The socket in the world, from the hand's, its forearm's and its thumb's
 * joints (in the scene's frame). Null when the hand cannot be read.
 */
export declare function socketWorld(side: 'r' | 'l', hand: Vec3, lowerarm: Vec3, thumb: Vec3): Mat4 | null;
/** The socket as a child of the hand, whose world matrix is `handWorld`. */
export declare function socketInHand(side: 'r' | 'l', handWorld: Mat4, lowerarm: Vec3, thumb: Vec3): Mat4 | null;
export interface Grip {
    x: number;
    y: number;
    z: number;
    rx: number;
    ry: number;
    rz: number;
    scale?: number;
}
/** A grip's point and turn in the socket's frame (no scale). */
export declare function gripMatrix(g: Grip): Mat4;
/**
 * An item's place in the socket's frame: scaled by the grip's `scale` and
 * turned, with its grip point (`grip`, in its own frame) at the grip.
 */
export declare function heldMatrix(g: Grip, grip: Vec3): Mat4;
/**
 * Where an item is held, in its own frame: the middle of its lowest third
 * (a pistol's handle hangs below its slide). Null for an empty or flat item.
 */
export declare function gripPoint(positions: ArrayLike<number>): Vec3 | null;
//# sourceMappingURL=hand-socket.d.ts.map