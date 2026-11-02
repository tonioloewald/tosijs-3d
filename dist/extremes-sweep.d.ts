import type { HumanPack, HumanProxy } from './human-pack.js';
import type { FittedRig } from './rig-fit.js';
import type { Corner } from './extremes-corners.js';
import { type MeshSdf } from './mesh-sdf.js';
import { type Penetration } from './extremes-penetration.js';
import { type BoneIssue } from './extremes-bones.js';
import { type HeadScalp, type HairPiece, type ReferenceHead } from './hair-place.js';
/** The character builder's hat lift (character.ts's HAT_LIFT). */
export declare const HAT_LIFT = 0.012;
/** The character builder's armour lift along the normals. */
export declare const ARMOUR_LIFT = 0.005;
export interface ItemLicence {
    licence: string;
    author: string;
    source: string;
}
export interface SweepItem {
    /** `makehuman:proxy/<name>` or `quaternius:hair/<name>`. */
    id: string;
    name: string;
    source: 'makehuman' | 'quaternius';
    category: string;
    slot: string | null;
    licence: ItemLicence | null;
    /** Vertices tested per body (0 until swept). */
    vertices: number;
}
/** One item on one corner. */
export type ItemCorner = Omit<Penetration, 'worst'>;
export interface CornerResult {
    corner: Corner;
    height: number;
    bones: BoneIssue[];
    /** By item id; an item with nothing inside on this body is absent. */
    items: Record<string, ItemCorner>;
    ms: number;
}
export interface SweepResult {
    items: SweepItem[];
    corners: CornerResult[];
    /** Joints outside the skin on the default body (a property of the rig table). */
    boneBaseline: string[];
    boundaryEdges: number;
}
export interface SweepInput {
    pack: HumanPack;
    corners: Corner[];
    /** Pack proxy names to wear. */
    proxies: string[];
    hair?: {
        pieces: HairPiece[];
        heads: ReferenceHead[];
    };
    licences?: Record<string, ItemLicence>;
    tolerance?: number;
    handleCorner?: (done: number, total: number, result: CornerResult) => void;
}
/** Pieces of the hair library the sweep wears: adult hair and beards. */
export declare function sweptHair(pieces: HairPiece[]): HairPiece[];
/** A corner's body, morphed and measured, ready to wear things. */
export interface Body {
    corner: Corner;
    full: Float32Array;
    clothBody: Float32Array;
    sdf: MeshSdf;
    height: number;
    head: HeadScalp;
    rig: FittedRig;
    normals(): Float32Array;
}
export declare function makeBody(pack: HumanPack, corner: Corner, regions: {
    nipples: Float32Array | null;
    lips: Float32Array | null;
}): Promise<Body>;
/** Something to wear: a pack proxy or a library hair piece. */
export type Wearable = {
    kind: 'proxy';
    id: string;
    proxy: HumanProxy;
} | {
    kind: 'hair';
    id: string;
    piece: HairPiece;
    head: ReferenceHead;
    on: 'scalp' | 'face';
};
/** An item on a body: the points tested, and the mesh to draw. */
export interface Worn {
    /** Vertices tested (a proxy's fitted rows, or its drawn vertices for armour). */
    points: Float32Array;
    /** The drawn mesh: positions and triangles. */
    drawn: Float32Array;
    triangles: Uint32Array;
    /** The skin's tuck under it per body triangle, or null (nothing tucked). */
    tuck: (() => Float32Array) | null;
}
export declare function wear(pack: HumanPack, body: Body, w: Wearable): Worn;
/** What the sweep wears: the named pack proxies and the library's adult hair. */
export declare function wearables(pack: HumanPack, proxies: string[], hair: {
    pieces: HairPiece[];
    heads: ReferenceHead[];
} | undefined, licences?: Record<string, ItemLicence>): Promise<Array<{
    item: SweepItem;
    wearable: Wearable;
}>>;
export declare function runSweep(input: SweepInput): Promise<SweepResult>;
export declare const SAVED_COLUMNS: readonly ["raw", "rawDepth (0.1 mm)", "visible", "visibleDepth (0.1 mm)", "visible beyond 2 mm", "beyond 5 mm", "beyond 10 mm"];
export type SavedRow = [number, number, number, number, number, number, number];
export interface SavedResult extends Omit<SweepResult, 'corners'> {
    columns: typeof SAVED_COLUMNS;
    corners: Array<Omit<CornerResult, 'items'> & {
        items: Record<string, SavedRow>;
    }>;
}
export declare function saveResult(r: SweepResult): SavedResult;
export declare function loadResult(s: SavedResult): SweepResult;
//# sourceMappingURL=extremes-sweep.d.ts.map