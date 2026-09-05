import * as BABYLON from '@babylonjs/core';
import { AbstractMesh } from './b3d-utils.js';
import type { B3d } from './tosi-b3d.js';
import type { CombatEvent, ChainLink } from './destroyable.js';
import { type Prefab } from './prefab.js';
export declare class B3dDestroyable extends AbstractMesh {
    static preferredTagName: string;
    static initAttributes: {
        meshName: string;
        /**
         * Instantiate `meshName` from this LIBRARY instead of drawing the
         * placeholder cube (`<tosi-b3d-library type="...">`). Absent = cube, so
         * nothing existing changes.
         *
         * The gap this closes: a static, destroyable thing that uses a library mesh
         * is most of what populates a level, and there was no route to it —
         * `b3d-loader` takes a `url` (which also loses the canonical frame), and
         * `b3d-aircraft` gets the frame right but flies. Reported by manta-recon
         * (#22), where `library` was silently ignored and the resulting cube read
         * as a deliberate placeholder rather than a fallback.
         */
        library: string;
        /**
         * `'off'` places the mesh WITHOUT enrolling it in combat — same knob and
         * same spelling as [b3d-loader](?b3d-loader.ts) already has.
         *
         * This element is the only way to place a LIBRARY mesh by name, so scenery
         * had no way out: an ensemble is mostly structure, and every wall and floor
         * was getting a combat record whether or not anything could shoot it
         * (tosijs-3d-ensemble, whose stopgap was `armor: 100_000` — buying "cannot
         * be killed" by paying for a combatant).
         */
        destroyable: "on" | "off";
        size: number;
        /**
         * Uniform scale for a **library-backed** piece — the lever `size` is not.
         *
         * `size` is the placeholder cube's edge length and does nothing once
         * `library` is set, which left a placed model with no way to be resized at
         * all: ensemble measured a piece rendering at 5.273 units for
         * `scale` 1, 2 and 4 alike, the value going in and nothing coming out
         * (#47). Kept as a separate attribute rather than overloading `size`,
         * because a cube's edge length and a model's multiplier are different
         * quantities and one of them is already documented.
         */
        scale: number;
        color: string;
        capacity: number;
        armor: number;
        regenRate: number;
        regenDelay: number;
        protectedBy: string;
        protection: number;
        remains: string;
        sound: string;
        soundVolume: number;
        explode: string;
        explodeForce: number;
        deathBlast: string;
        blastDamage: number;
        blastFullRadius: number;
        blastRadius: number;
        blastDelay: number;
        x: number;
        y: number;
        z: number;
        rx: number;
        ry: number;
        rz: number;
        axes: boolean;
    };
    meshName: string;
    destroyable: 'on' | 'off';
    size: number;
    scale: number;
    color: string;
    capacity: number;
    armor: number;
    regenRate: number;
    regenDelay: number;
    protectedBy: string;
    protection: number;
    explode: string;
    explodeForce: number;
    deathBlast: string;
    blastDamage: number;
    blastFullRadius: number;
    blastRadius: number;
    blastDelay: number;
    /**
     * On-destruction direct-transfer chain links (set in code; see destroyable.ts).
     * Distinct from `deathBlast`, which is an AOE explosion. Mirrored to the behavior.
     */
    chain: ChainLink[];
    private _behavior?;
    private _onShift?;
    /**
     * Optional code-set hook, run once when this target is destroyed (before the
     * visual outcome). The clean seam for putting a linked player/vehicle into a
     * 'dead' state, spawning loot/wreckage, swapping a model, etc. Also rides the
     * bubbling `destroyed` CustomEvent.
     */
    whenDestroyed?: (info: {
        id: string;
        position: BABYLON.Vector3;
    }) => void;
    /** A prefab FUNCTION, when a name won't do (a closure over game state). Takes precedence
     * over the `remains` attribute. Not `onRemains` — an `on*` prop would be bound as a DOM
     * event listener and never fire (see CLAUDE.md). */
    remainsPrefab: Prefab | null;
    /** Spawn `remains` (+ the death `sound`) at the death pose. Both optional; a destroyable
     * with neither just vanishes, as before. */
    private _leaveRemains;
    /** This entity's id in the scene combat world (also its mesh name). */
    get combatId(): string;
    /** True once destroyed (mesh gone / exploding). Lets others skip dead targets. */
    get dead(): boolean;
    /** Name the node by the combat id and register it, whenever it arrives. */
    private _adopt;
    /**
     * Instantiate the model, retrying until the library is mounted and loaded.
     *
     * The library element may connect after this one (declaration order in a
     * scene is the author's business, not a load-order contract), so a single
     * lookup would lose the race — the same wait `b3d-aircraft` does.
     */
    private _loadFromLibrary;
    sceneReady(owner: B3d, scene: BABYLON.Scene): void;
    /** Hurt this target; returns the combat events from this hit (flashes on a hit). */
    damage(amount: number): CombatEvent[];
    /**
     * Set on-destruction chain links AFTER mount — chains reference other targets'
     * combat ids, which only exist once those elements have mounted.
     */
    setChain(links: ChainLink[]): void;
    /**
     * Push `scale` onto the instantiated node.
     *
     * A library instance's root is a `TransformNode`, so scaling it scales the
     * whole model — which is what a placed piece means by scale. Uniform on
     * purpose: a non-uniform scale on an arbitrary model is a modelling
     * decision, not a placement one, and it breaks normals.
     */
    private _stopLoad;
    private _applyScale;
    render(): void;
    sceneDispose(): void;
}
export declare const b3dDestroyable: import("tosijs").ElementCreator<B3dDestroyable>;
//# sourceMappingURL=b3d-destroyable.d.ts.map