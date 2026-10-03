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
/** `b3d-ground` — the simple ground plane. `size` of `0` means use width/height. */
export declare function groundSchema(extra?: Record<string, unknown>): {
    type: string;
    title: string;
    properties: Record<string, unknown>;
};
/**
 * `b3d-terrain` — the streaming LOD heightfield.
 *
 * The noise scales get `log`, because they span decades and a linear track puts
 * every useful value in its first few percent — the case that motivated log
 * sliders in the first place.
 */
export declare function terrainSchema(extra?: Record<string, unknown>): {
    type: string;
    title: string;
    properties: Record<string, unknown>;
};
/**
 * `b3d-reflections` — dynamic probes for `_mirror` meshes.
 *
 * Every knob here is a COST dial, which is why they all carry ranges: a probe
 * renders six faces, and `refreshRate` is how many frames it may skip between
 * doing so. See TODO's arbitration note before turning these up in content a
 * consumer inserts.
 */
export declare function reflectionsSchema(extra?: Record<string, unknown>): {
    type: string;
    title: string;
    properties: Record<string, unknown>;
};
/**
 * `b3d-cloud-deck` — the tiled cloud deck: one coverage dial, cirrus, wind,
 * orographic cloud and the shared cloud shadow (tosijs-3d#87).
 *
 * The ranges are the ones the element's own docs state; where they state none
 * (altitude, wind, the depths) they are generous working bounds, not limits
 * the element enforces.
 */
export declare function cloudDeckSchema(extra?: Record<string, unknown>): {
    type: string;
    title: string;
    properties: Record<string, unknown>;
};
/**
 * `b3d-moon` — a cosmetic moon in the skybox (tosijs-3d#93). Its PHASE is
 * shaded from the real sun, so it is not a setting.
 */
export declare function moonSchema(extra?: Record<string, unknown>): {
    type: string;
    title: string;
    properties: Record<string, unknown>;
};
/**
 * `b3d-weather-cell` — a region whose weather differs (tosijs-3d#97). What it
 * ADDS at its centre, easing to nothing at the rim. Coverage past 1 closes the
 * sky over its inner part (a storm).
 */
export declare function weatherCellSchema(extra?: Record<string, unknown>): {
    type: string;
    title: string;
    properties: Record<string, unknown>;
};
/** `b3d-lightning` — strikes under stormy weather cells (tosijs-3d#97). */
export declare function lightningSchema(extra?: Record<string, unknown>): {
    type: string;
    title: string;
    properties: Record<string, unknown>;
};
/** `b3d-light-shafts` — sun shafts under broken cloud and under water
 * (tosijs-3d#97). */
export declare function lightShaftsSchema(extra?: Record<string, unknown>): {
    type: string;
    title: string;
    properties: Record<string, unknown>;
};
/** `b3d-decorator` — rocks and trees on the terrain, by budget
 * (tosijs-3d#97). `url` is FETCHED. */
export declare function decoratorSchema(extra?: Record<string, unknown>): {
    type: string;
    title: string;
    properties: Record<string, unknown>;
};
/** `b3d-trail` — a ribbon behind whatever it is nested in (tosijs-3d#97). */
export declare function trailSchema(extra?: Record<string, unknown>): {
    type: string;
    title: string;
    properties: Record<string, unknown>;
};
/**
 * `b3d-sound` — positional audio (tosijs-3d#95). `url` is FETCHED, so it is a
 * `uri-reference` like every other fetched field, where a URL rule can see it.
 */
export declare function soundSchema(extra?: Record<string, unknown>): {
    type: string;
    title: string;
    properties: Record<string, unknown>;
};
/** Every scene-primitive schema, by the element name a consumer would use. */
export declare const sceneSchemas: {
    readonly skybox: typeof skyboxSchema;
    readonly sun: typeof sunSchema;
    readonly water: typeof waterSchema;
    readonly fog: typeof fogSchema;
    readonly clouds: typeof cloudsSchema;
    readonly ambient: typeof ambientSchema;
    readonly light: typeof hemisphericLightSchema;
    readonly ground: typeof groundSchema;
    readonly terrain: typeof terrainSchema;
    readonly reflections: typeof reflectionsSchema;
    readonly cloudDeck: typeof cloudDeckSchema;
    readonly moon: typeof moonSchema;
    readonly weatherCell: typeof weatherCellSchema;
    readonly lightning: typeof lightningSchema;
    readonly lightShafts: typeof lightShaftsSchema;
    readonly decorator: typeof decoratorSchema;
    readonly trail: typeof trailSchema;
    readonly sound: typeof soundSchema;
};
//# sourceMappingURL=scene-schemas.d.ts.map