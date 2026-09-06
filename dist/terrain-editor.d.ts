import { type Widget3d } from './widgets3d.js';
/** Terrain settings — a loose bag, because the schema is the authority. */
export type TerrainSettings = Record<string, number | string | boolean>;
export interface TerrainEditor3dOptions {
    value?: TerrainSettings;
    /** Show the LOD and surface-wrapping groups too. */
    advanced?: boolean;
    /** Live, on every edit. */
    handleChange?: (settings: TerrainSettings) => void;
    /** @deprecated use `handleChange` — removed in 0.9. */
    onChange?: (settings: TerrainSettings) => void;
    /** Once per gesture, for an undo step. */
    handleCommit?: (settings: TerrainSettings, describe: string) => void;
}
export interface TerrainEditorField extends Widget3d {
    readonly value: TerrainSettings;
    setValue: (next: Partial<TerrainSettings>) => void;
}
export declare function terrainEditor3d(config?: TerrainEditor3dOptions): TerrainEditorField;
//# sourceMappingURL=terrain-editor.d.ts.map