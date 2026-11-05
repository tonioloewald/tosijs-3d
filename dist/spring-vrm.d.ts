/** A spring's settings in our model (`spring-chain`): per second, gravity in m/s². */
export interface SpringSettings {
    stiffness: number;
    damping: number;
    /** Downward, metres per second². */
    gravity: number;
    /** The chain's thickness, for colliders. */
    radius: number;
}
/** One joint of a `VRMC_springBone` spring. */
export interface VrmSpringJoint {
    node: number;
    hitRadius: number;
    stiffness: number;
    gravityPower: number;
    gravityDir: [number, number, number];
    dragForce: number;
}
/**
 * VRM's settings for one of our chain's joints, `length` its segment's
 * length in metres. Drag and gravity are exact at 60 frames a second;
 * stiffness matches the droop of a level segment (see above).
 */
export declare function vrmSpringJoint(node: number, s: SpringSettings, length: number): VrmSpringJoint;
/** A sphere on a joint: offset in the joint's own frame, metres. */
export interface SpringColliderOut {
    node: number;
    offset: [number, number, number];
    radius: number;
}
/** A chain as it goes out: the joints from its root to its tip, and what it meets. */
export interface SpringChainOut {
    name: string;
    kind: 'bones' | 'strand';
    /** Node indices, root first; the last is the tip. */
    joints: number[];
    settings: SpringSettings;
    colliders: SpringColliderOut[];
    /** A strand's source, for the record: what it hangs from and where it runs. */
    strand?: {
        anchor: number;
        /** In the file's frame (metres, right-handed), from the anchor's place. */
        path: Array<[number, number, number]>;
        radius: number;
        tipRadius: number;
        color: string;
    };
}
/** The name of our own record of the springs. */
export declare const TOSIJS_SPRINGS = "TOSIJS_spring_chains";
/**
 * The root `extensions` for a file's springs: `VRMC_springBone` (1.0) for
 * every VRM loader, and `TOSIJS_spring_chains` with our own settings.
 * `positions` gives each node's place in the file at rest, for segment lengths.
 */
export declare function springExtensions(chains: SpringChainOut[], positions: ReadonlyArray<readonly [number, number, number]>): Record<string, unknown>;
/** JSON Schema of `TOSIJS_spring_chains`: the one definition the builder and the exports share. */
export declare function springChainsSchema(): Record<string, unknown>;
//# sourceMappingURL=spring-vrm.d.ts.map