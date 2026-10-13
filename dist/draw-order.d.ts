import type * as BABYLON from '@babylonjs/core';
interface Point {
    x: number;
    y: number;
    z: number;
}
/**
 * Where a mesh sorts: its squared distance from the eye, or past everything
 * when it is pinned to the camera (a sky), whose own distance is zero.
 */
export declare function drawKey(infinite: boolean, centre: Point, eye: Point): number;
/**
 * A compare function for `setRenderingOrder`: nearest first, the sky last.
 *
 * Each submesh's key is worked out ONCE per pass (a pass is one render id seen
 * from one camera) and kept on a side table. A sort compares each item many
 * times; working the key out inside the comparison cost about ten times as
 * much (5.7 ms against 0.7 ms for 3,000 submeshes), per eye and per render
 * target.
 */
export declare function nearFirst(scene: Pick<BABYLON.Scene, 'activeCamera' | 'getRenderId'>): (a: BABYLON.SubMesh, b: BABYLON.SubMesh) => number;
export {};
//# sourceMappingURL=draw-order.d.ts.map