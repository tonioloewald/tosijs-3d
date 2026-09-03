/**
 * `b3d-skybox` — the procedural sky and its day/night cycle.
 *
 * `realtimeScale` gets a log scale WITH a zero stop: 0 is a still sky and the
 * default, 1 is realtime, 3600 is an hour a second. On a linear track every
 * value anyone wants sits in the first thousandth of the travel, and a plain
 * log track cannot reach the default at all.
 */
export declare function skyboxSchema(extra?: Record<string, unknown>): {
    type: string;
    title: string;
    properties: Record<string, unknown>;
};
/** `b3d-sun` — the directional light and its cascaded shadow maps. */
export declare function sunSchema(extra?: Record<string, unknown>): {
    type: string;
    title: string;
    properties: Record<string, unknown>;
};
/** `b3d-water` — the water surface, its waves, and the look from underneath. */
export declare function waterSchema(extra?: Record<string, unknown>): {
    type: string;
    title: string;
    properties: Record<string, unknown>;
};
/** `b3d-fog` — scene fog. `syncSkybox` ties its colour to the sky. */
export declare function fogSchema(extra?: Record<string, unknown>): {
    type: string;
    title: string;
    properties: Record<string, unknown>;
};
/** `b3d-clouds` — the opaque blob cloud layer you can fly into. */
export declare function cloudsSchema(extra?: Record<string, unknown>): {
    type: string;
    title: string;
    properties: Record<string, unknown>;
};
/**
 * `b3d-ambient` — device-budgeted garnish (motes, bubbles, leaves).
 *
 * `disabled` is the negative form on purpose: a boolean attribute cannot
 * default true, because an absent boolean reads false. Every on-by-default
 * switch in this library is either inverted like this or an `'on'|'off'` string.
 */
export declare function ambientSchema(extra?: Record<string, unknown>): {
    type: string;
    title: string;
    properties: Record<string, unknown>;
};
/** `b3d-light` — the hemispheric ambient fill. Not a lamp; see `light-settings`. */
export declare function hemisphericLightSchema(extra?: Record<string, unknown>): {
    type: string;
    title: string;
    properties: Record<string, unknown>;
};
/**
 * Attributes deliberately NOT exposed, and why.
 *
 * Every scene element extends `AbstractMesh`, which contributes a transform
 * (`x y z rx ry rz`) and an `axes` debug helper whether or not the element does
 * anything with them. Omitting silently is how ensemble's copy went wrong, so
 * omissions are listed and the drift test checks that anything missing from a
 * schema appears HERE — a forgotten attribute fails, a declined one does not.
 */
export declare const SCENE_OMITTED: Record<string, string[]>;
/** Every scene-primitive schema, by the element name a consumer would use. */
export declare const sceneSchemas: {
    readonly skybox: typeof skyboxSchema;
    readonly sun: typeof sunSchema;
    readonly water: typeof waterSchema;
    readonly fog: typeof fogSchema;
    readonly clouds: typeof cloudsSchema;
    readonly ambient: typeof ambientSchema;
    readonly light: typeof hemisphericLightSchema;
};
//# sourceMappingURL=scene-schemas.d.ts.map