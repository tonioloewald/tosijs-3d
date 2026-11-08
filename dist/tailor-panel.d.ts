import { type TailorTool, type TailorState } from './tailor-tool.js';
import { type GarmentMeta } from './garment-file.js';
import { type MaterialRecipe } from './material-recipe.js';
import type { RiggedBody } from './rigged-body.js';
/** What the garment picker offers to start a garment from nothing. */
export declare const NEW_GARMENT = "(new garment)";
/** A new garment's work in progress, kept by the host between sessions. */
export interface TailorDraft {
    cut: TailorState['cut'];
    look: MaterialRecipe;
    name: string;
}
/** Where garment files are kept, by name. */
export interface GarmentStore {
    put(name: string, bytes: Uint8Array): Promise<void>;
    delete(name: string): Promise<void>;
    /** Every file kept. */
    all(): Promise<Uint8Array[]>;
}
/** This browser's garment files (IndexedDB `tosijs-garments`). */
export declare function garmentStore(): GarmentStore;
/** A get/set pair: a value the host keeps. */
export interface Kept<T> {
    get(): T;
    set(value: T): void;
}
export interface TailorPanelOptions {
    /** The character dressed (`makeCharacter`), or null while it is made. */
    character: () => any;
    /**
     * The body to cut from (`{ body, built, source }`, a character's `shown`),
     * or why there is none just now (said in the panel).
     */
    target: () => {
        body: RiggedBody;
        built: any;
        source: string;
    } | string;
    slots: readonly string[];
    /** What a slot can wear, by name. */
    choices: (slot: string) => string[];
    /** What a slot wears now, and wear something in it. */
    worn: (slot: string) => string;
    wear: (slot: string, name: string) => void;
    /** What a new garment says it was made on (`base`, `pack`, `body`; or `source`). */
    madeOn: (source: string) => GarmentMeta;
    /** A name no garment may take (MakeHuman's own clothes). */
    reserved?: (name: string) => boolean;
    /** Where garment files go (default `garmentStore()`). */
    store?: GarmentStore;
    /** The new garment's draft. */
    draft: Kept<TailorDraft>;
    /** The slot the tailor is on (default its own, starting at `top`). */
    slot?: Kept<string>;
    /** "Hide other clothes" (default its own). */
    hideOthers?: Kept<boolean>;
    /** Export with the body as a helper (default its own, on). */
    includeBody?: Kept<boolean>;
    /** The body as a helper in an exported garment. */
    helperBody: () => {
        positions: ArrayLike<number>;
        triangles: ArrayLike<number>;
    } | null;
    /** Save a file: a GLB's bytes or an OBJ's text. */
    save: (data: Uint8Array | string, name: string, type: string) => void;
    /** The draft or the wardrobe changed: the host's autosave. */
    handleChange?: () => void;
    /** A garment was kept or forgotten: the host's panels list them. */
    handleWardrobe?: () => void;
    /** A message for the user (also shown in the panel). */
    handleMessage?: (message: string) => void;
}
export interface TailorPanelHandle {
    /** The `<tosi-b3d-panel>` on the system bar. */
    readonly panel: HTMLElement;
    readonly open: boolean;
    /** The tailor tool while it is cutting. */
    readonly tool: TailorTool | null;
    /** What is being cut: its slot, its name (null for a new one), its body's source. */
    readonly editing: {
        slot: string;
        name: string | null;
        source: string;
    } | null;
    readonly message: string;
    /** Cut the picked garment (or a new one), or say why not. */
    begin(): void;
    /** Keep a closed outline as a garment and put the tool away. */
    keep(): Promise<void>;
    /** Forget the picked garment of your own, its file too. */
    forget(): Promise<void>;
    refresh(): void;
    say(message: string): void;
    /** The garment to take to an editor (the one being cut, else the slot's own), or null. */
    garmentFile(format: 'glb' | 'obj', bodyAlone?: boolean): Uint8Array | string | null;
    /** Keep a garment file from an editor, worn in its slot. */
    importFrom(data: ArrayBuffer | Uint8Array | string, fileName: string): Promise<void>;
}
/** The tailor on the system bar of `el` (a `<tosi-b3d>`). */
export declare function tailorPanel(el: any, options: TailorPanelOptions): TailorPanelHandle;
//# sourceMappingURL=tailor-panel.d.ts.map