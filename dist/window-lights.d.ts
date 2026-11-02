import * as BABYLON from '@babylonjs/core';
/**
 * Whether a room with this habit has its light on at `hour`. `habit` and
 * `shift` are the room's own (0 to 1; the shader takes them from the room's
 * hash), `roll` a fresh 0 to 1 per few minutes of the clock (the bathroom).
 * The shader mirrors this; it is here so the habits can be tested.
 */
export declare function roomLit(habit: number, shift: number, hour: number, roll: number): boolean;
export declare class WindowLightsPlugin extends BABYLON.MaterialPluginBase {
    /** The time of day, hours. */
    hour: number;
    /** How bright a lit window is, 0 by day to 1 at night. */
    glow: number;
    /** A room's size, metres. */
    room: BABYLON.Vector3;
    /** Rooms are counted from here (the city's root), so a floating-origin shift does not relight them. */
    origin: BABYLON.TransformNode | null;
    /** A different set of rooms for the same city. */
    seed: number;
    private _isEnabled;
    constructor(material: BABYLON.Material);
    get isEnabled(): boolean;
    set isEnabled(enabled: boolean);
    prepareDefines(defines: BABYLON.MaterialDefines): void;
    getClassName(): string;
    getUniforms(): {
        ubo: {
            name: string;
            size: number;
            type: string;
        }[];
        fragment: string;
    };
    bindForSubMesh(uniformBuffer: BABYLON.UniformBuffer): void;
    getCustomCode(shaderType: string): {
        [pointName: string]: string;
    } | null;
}
/** Light the windows of a building material (the plugin, enabled). */
export declare function windowLights(material: BABYLON.Material, options?: {
    origin?: BABYLON.TransformNode;
    room?: BABYLON.Vector3;
    seed?: number;
}): WindowLightsPlugin;
//# sourceMappingURL=window-lights.d.ts.map