import * as BABYLON from '@babylonjs/core';
import { B3dChild } from './b3d-utils.js';
import type { B3d } from './tosi-b3d.js';
import { type InteractionInfo } from './interactive-behavior.js';
import type { ActivationVeto } from './interaction.js';
export declare class B3dInteractive extends B3dChild {
    static preferredTagName: string;
    static shadowStyleSpec: {
        ':host': {
            display: string;
        };
    };
    static initAttributes: {
        /** Mesh/node name. Empty = the mesh of the element this is nested inside. */
        target: string;
        /** `'subtree'` (the node and its children) or `'self'`. */
        include: string;
        /** Max distance in world units; 0 = no limit. */
        reach: number;
        disabled: boolean;
        /** Hover outline colour, or `'none'`. */
        highlight: string;
    };
    target: string;
    include: string;
    reach: number;
    disabled: boolean;
    highlight: string;
    owner: B3d | null;
    whenActivated: ((info: InteractionInfo) => void) | null;
    whenHovered: ((info: InteractionInfo) => void) | null;
    whenUnhovered: ((info: InteractionInfo) => void) | null;
    whenRefused: ((info: InteractionInfo) => void) | null;
    /**
     * Other features' refusals — see the doc above. Lives on the element (not
     * behind the behaviour) so a `lockable` can be pushed before the scene is up.
     */
    vetoes: Array<ActivationVeto<InteractionInfo>>;
    private _behavior;
    private _cache;
    content: () => string;
    sceneReady(owner: B3d, _scene: BABYLON.Scene): void;
    sceneDispose(): void;
    /** Is the pointer on it right now? */
    get hovered(): boolean;
    /** True when nothing refuses an activation — i.e. using it would do something. */
    get operable(): boolean;
    /** Use it without pointing at it (a key press, an NPC, a test). */
    activate(info?: Partial<InteractionInfo>): boolean;
    /**
     * Tuned state for the console / `hj eval`. Says whether the target NAME
     * resolved, which is the one thing that silently makes an interactive inert.
     */
    get debugState(): {
        enabled: boolean;
        phase: import("./interaction.js").InteractPhase;
        armed: boolean;
        meshes: string[];
        reach: number;
        judgedWith: InteractionInfo;
        vetoes: string[];
        target: any;
        resolved: boolean;
    } | {
        attached: boolean;
        target: any;
        resolved: boolean;
    };
    /**
     * The meshes that count as "this thing".
     *
     * Cached, because a pointer move fires on every frame the mouse is in motion
     * and `getChildMeshes` allocates — but re-resolved whenever the cache is empty
     * or anything in it has been disposed, so a GLB that loads late starts working
     * when it arrives instead of never.
     */
    private _meshes;
}
export declare const b3dInteractive: import("tosijs").ElementCreator<B3dInteractive>;
//# sourceMappingURL=b3d-interactive.d.ts.map