/*#
# Scene schemas

**JSON Schema for the scene primitives, so a consumer never hand-copies our
attributes.** No DOM, no Babylon — importable from a headless runner.

## Why this exists

`tosijs-3d-ensemble` generates its property panels from JSON Schema, and wrote
one for `b3d-skybox` by hand: a copy of our attributes, maintained in another
repository, against a component they do not own. It drifted in both directions
within one release — their schema exposed **6 of 16** attributes (the other ten
were never hidden deliberately, just not copied), and their `applyFog` defaulted
`true` where ours defaults `false`. Same name, same component, opposite
behaviour, and nothing anywhere failed.

`lightSettingsSchema` had already shown the alternative: mark one field and the
whole lamp appears, with no schema on their side to maintain. This is that,
for the rest of the scene.

## These carry NO `x-widget`

Deliberately, and it is the one thing to get right. A widget token says "hand
this whole value to a custom editor" — correct for a light program, wrong here,
because a consumer's generated panel already renders numbers, colours, booleans
and enums perfectly well. Adding a token would point at an editor that does not
exist and break the panel that works.

What these DO carry is everything `initAttributes` cannot say: ranges, units,
enum members, colour formats, and which sliders want a log scale.

## Drift is a test, not a promise

The defaults here are duplicated from the components — there is no way to read
them without importing Babylon, which is exactly what makes this module usable.
So `scene-schemas.test.ts` imports the real components and fails if an attribute
is missing, extra, or disagrees on its default. The copy is allowed to exist
because it cannot silently rot.
*/
/*{ "parent": "Core", "order": 320 }*/
/** A number with a range and, where it helps, a unit and a scale hint. */
const num = (def, extra = {}) => ({ type: 'number', default: def, ...extra });
const color = (def) => ({
    type: 'string',
    default: def,
    format: 'color',
});
const bool = (def) => ({
    type: 'boolean',
    default: def,
});
const choice = (def, values) => ({
    type: 'string',
    default: def,
    enum: values,
});
/** Degrees, minutes, metres — the units a panel should show beside a number. */
const DEG = { 'x-unit': 'deg' };
const M = { 'x-unit': 'm' };
const MS = { 'x-unit': 'ms' };
const schema = (title, properties, extra) => ({ type: 'object', title, properties, ...extra });
/**
 * `b3d-skybox` — the procedural sky and its day/night cycle.
 *
 * `realtimeScale` gets a log scale WITH a zero stop: 0 is a still sky and the
 * default, 1 is realtime, 3600 is an hour a second. On a linear track every
 * value anyone wants sits in the first thousandth of the travel, and a plain
 * log track cannot reach the default at all.
 */
export function skyboxSchema(extra = {}) {
    return schema('Sky', {
        timeOfDay: num(6.5, { minimum: 0, maximum: 24, 'x-unit': 'h' }),
        realtimeScale: num(10, {
            minimum: 0,
            maximum: 3600,
            'x-scale': 'log',
            'x-zero-stop': true,
        }),
        latitude: num(40, { minimum: -90, maximum: 90, ...DEG }),
        azimuth: num(0, { minimum: 0, maximum: 360, ...DEG }),
        turbidity: num(10, { minimum: 1, maximum: 40 }),
        luminance: num(1, { minimum: 0, maximum: 2 }),
        rayleigh: num(2, { minimum: 0, maximum: 4 }),
        mieCoefficient: num(0.005, { minimum: 0, maximum: 0.05 }),
        mieDirectionalG: num(0.8, { minimum: 0, maximum: 1 }),
        sunColor: color('#eeeeff'),
        duskColor: color('#ffaa22'),
        moonColor: color('#6688cc'),
        moonIntensity: num(0.15, { minimum: 0, maximum: 1 }),
        skyboxSize: num(1000, { minimum: 100, maximum: 20000, ...M }),
        updateFrequencyMs: num(100, { minimum: 16, maximum: 2000, ...MS }),
        applyFog: bool(false),
    }, extra);
}
/** `b3d-sun` — the directional light and its cascaded shadow maps. */
export function sunSchema(extra = {}) {
    return schema('Sun', {
        intensity: num(1, { minimum: 0, maximum: 10 }),
        x: num(0, { minimum: -1, maximum: 1 }),
        y: num(-1, { minimum: -1, maximum: 1 }),
        z: num(-0.5, { minimum: -1, maximum: 1 }),
        shadowDarkness: num(0.1, { minimum: 0, maximum: 1 }),
        shadowMaxZ: num(100, { minimum: 1, maximum: 2000, ...M }),
        activeDistance: num(30, { minimum: 1, maximum: 500, ...M }),
        // 0 is AUTO — resolved against the device tier, like every budget here.
        shadowTextureSize: num(0, { minimum: 0, maximum: 4096 }),
        numCascades: num(0, { minimum: 0, maximum: 4 }),
        stabilizeCascades: choice('on', ['on', 'off']),
        lambda: num(0.8, { minimum: 0, maximum: 1 }),
        cascadeBlendPercentage: num(0.1, { minimum: 0, maximum: 1 }),
        shadowNormalBias: num(0.05, { minimum: 0, maximum: 0.5 }),
        shadowBias: num(0.00005, { minimum: 0, maximum: 0.01 }),
        updateIntervalMs: num(1000, { minimum: 0, maximum: 10000, ...MS }),
    }, extra);
}
/** `b3d-water` — the water surface, its waves, and the look from underneath. */
export function waterSchema(extra = {}) {
    return schema('Water', {
        waterColor: color('#0066cc'),
        colorBlendFactor: num(0.1, { minimum: 0, maximum: 1 }),
        waveHeight: num(0, { minimum: 0, maximum: 2, ...M }),
        waveLength: num(0.1, { minimum: 0.01, maximum: 5 }),
        bumpHeight: num(0.1, { minimum: 0, maximum: 2 }),
        windForce: num(-5, { minimum: -50, maximum: 50 }),
        windDirectionX: num(0.6, { minimum: -1, maximum: 1 }),
        windDirectionY: num(0.8, { minimum: -1, maximum: 1 }),
        underwaterFog: num(0.12, { minimum: 0, maximum: 1 }),
        underwaterMurk: num(0.08, { minimum: 0, maximum: 1 }),
        fogTransition: num(0.2, { minimum: 0, maximum: 5, ...M }),
        // The WATER LEVEL, and the reason water's transform is exposed where the
        // sky's is not: `y` here is a scene fact an author sets deliberately.
        y: num(0, { ...M }),
        x: num(0, { ...M }),
        z: num(0, { ...M }),
        waterSize: num(128, { minimum: 1, maximum: 10000, ...M }),
        subdivisions: num(32, { minimum: 1, maximum: 256 }),
        textureSize: num(1024, { minimum: 64, maximum: 4096 }),
        normalMap: { type: 'string', default: '' },
        twoSided: bool(false),
        spherical: bool(false),
        follow: bool(false),
    }, extra);
}
/** `b3d-fog` — scene fog. `syncSkybox` ties its colour to the sky. */
export function fogSchema(extra = {}) {
    return schema('Fog', {
        mode: choice('linear', ['linear', 'exp', 'exp2']),
        color: color('#bfd9f2'),
        start: num(60, { minimum: 0, maximum: 5000, ...M }),
        end: num(120, { minimum: 0, maximum: 10000, ...M }),
        density: num(0.01, {
            minimum: 0,
            maximum: 1,
            'x-scale': 'log',
            'x-zero-stop': true,
        }),
        syncSkybox: bool(false),
    }, extra);
}
/** `b3d-clouds` — the opaque blob cloud layer you can fly into. */
export function cloudsSchema(extra = {}) {
    return schema('Clouds', {
        coverage: num(0.5, { minimum: 0, maximum: 1 }),
        count: num(36, { minimum: 0, maximum: 500 }),
        altitude: num(140, { minimum: 0, maximum: 5000, ...M }),
        thickness: num(36, { minimum: 0, maximum: 1000, ...M }),
        spread: num(1200, { minimum: 1, maximum: 20000, ...M }),
        size: num(70, { minimum: 1, maximum: 1000, ...M }),
        color: color('#ffffff'),
        opacity: num(1, { minimum: 0, maximum: 1 }),
        selfIllum: num(0.35, { minimum: 0, maximum: 1 }),
        fogDensity: num(1.0, { minimum: 0, maximum: 5 }),
        approach: num(0.8, { minimum: 0, maximum: 1 }),
        castShadows: bool(false),
        shadowStrength: num(0.65, { minimum: 0, maximum: 1 }),
        windX: num(4, { minimum: -100, maximum: 100 }),
        windZ: num(1.5, { minimum: -100, maximum: 100 }),
        seed: num(1, { minimum: 0 }),
        model: { type: 'string', default: '' },
    }, extra);
}
/**
 * `b3d-ambient` — device-budgeted garnish (motes, bubbles, leaves).
 *
 * `disabled` is the negative form on purpose: a boolean attribute cannot
 * default true, because an absent boolean reads false. Every on-by-default
 * switch in this library is either inverted like this or an `'on'|'off'` string.
 */
export function ambientSchema(extra = {}) {
    return schema('Ambient', {
        preset: choice('motes', [
            'motes',
            'bubbles',
            'rain',
            'snow',
            'dust',
            'leaves',
        ]),
        where: choice('always', ['always', 'underwater', 'above']),
        disabled: bool(false),
        radius: num(18, { minimum: 0, maximum: 500, ...M }),
        // 0 is AUTO for both — the device tier decides.
        count: num(0, { minimum: 0, maximum: 20000 }),
        minCount: num(0, { minimum: 0, maximum: 20000 }),
        rate: num(0, { minimum: 0 }),
        size: num(0, { minimum: 0 }),
        minTier: choice('low', ['low', 'medium', 'high']),
        priority: num(0, { minimum: 0, maximum: 100 }),
        lookAhead: num(0.35, { minimum: 0, maximum: 5 }),
        lead: num(0.25, { minimum: 0, maximum: 5 }),
        speedCap: num(40, { minimum: 0, maximum: 500 }),
        color: { type: 'string', default: '', format: 'color' },
        windX: num(0, { minimum: -100, maximum: 100 }),
        windZ: num(0, { minimum: -100, maximum: 100 }),
    }, extra);
}
/** `b3d-light` — the hemispheric ambient fill. Not a lamp; see `light-settings`. */
export function hemisphericLightSchema(extra = {}) {
    return schema('Ambient light', {
        intensity: num(1, { minimum: 0, maximum: 4 }),
        diffuse: color('#ffffff'),
        specular: color('#808080'),
        x: num(0, { minimum: -1, maximum: 1 }),
        y: num(1, { minimum: -1, maximum: 1 }),
        z: num(0, { minimum: -1, maximum: 1 }),
    }, extra);
}
/**
 * Attributes deliberately NOT exposed, and why.
 *
 * Every scene element extends `AbstractMesh`, which contributes a transform
 * (`x y z rx ry rz`) and an `axes` debug helper whether or not the element does
 * anything with them. Omitting silently is how ensemble's copy went wrong, so
 * omissions are listed and the drift test checks that anything missing from a
 * schema appears HERE — a forgotten attribute fails, a declined one does not.
 */
export const SCENE_OMITTED = {
    // The sky is centred on the viewer; a position for it is meaningless, and a
    // rotation is `azimuth`.
    skybox: ['x', 'y', 'z', 'rx', 'ry', 'rz', 'axes'],
    // A directional light has a DIRECTION (x/y/z, exposed above) and no place,
    // so there is nothing here to decline.
    sun: [],
    // `y` IS the water level and is exposed; the plane is horizontal by
    // definition, so its rotation is not something to offer.
    water: ['rx', 'ry', 'rz', 'axes'],
    fog: [],
    // The layer places itself by `altitude` and `spread` and carries no
    // transform of its own.
    clouds: [],
    // Garnish follows the camera; `radius` and `where` place it, and it has no
    // transform to decline.
    ambient: [],
    light: [],
    // A ground IS a placed mesh, so its transform is exposed; `axes` is a debug
    // helper, never content.
    ground: ['axes'],
    terrain: [],
    reflections: [],
};
/** `b3d-ground` — the simple ground plane. `size` of `0` means use width/height. */
export function groundSchema(extra = {}) {
    return schema('Ground', {
        width: num(4, { minimum: 0, maximum: 10000, ...M }),
        height: num(4, { minimum: 0, maximum: 10000, ...M }),
        // 0 is "not square — use width and height", not "zero-sized".
        size: num(0, { minimum: 0, maximum: 10000, ...M }),
        color: color('#888888'),
        texture: { type: 'string', default: '' },
        textureTiles: num(8, { minimum: 1, maximum: 200 }),
        x: num(0, { ...M }),
        y: num(0, { ...M }),
        z: num(0, { ...M }),
        rx: num(0, { minimum: -180, maximum: 180, ...DEG }),
        ry: num(0, { minimum: -180, maximum: 180, ...DEG }),
        rz: num(0, { minimum: -180, maximum: 180, ...DEG }),
        meshName: { type: 'string', default: 'ground' },
    }, extra);
}
/**
 * `b3d-terrain` — the streaming LOD heightfield.
 *
 * The noise scales get `log`, because they span decades and a linear track puts
 * every useful value in its first few percent — the case that motivated log
 * sliders in the first place.
 */
export function terrainSchema(extra = {}) {
    return schema('Terrain', {
        seed: num(12345, { minimum: 0 }),
        surfaceType: choice('cylinder', ['cylinder', 'torus', 'sphere', 'plane']),
        grossScale: num(0.015, {
            minimum: 0.0001,
            maximum: 1,
            'x-scale': 'log',
        }),
        detailScale: num(0.09, { minimum: 0.0001, maximum: 1, 'x-scale': 'log' }),
        grossAmplitude: num(8, { minimum: 0, maximum: 500, ...M }),
        detailAmplitude: num(3, { minimum: 0, maximum: 200, ...M }),
        horizScale: num(1, { minimum: 0.01, maximum: 100 }),
        baseHeight: num(0, { minimum: -1000, maximum: 1000, ...M }),
        normalSmoothing: num(0.6, { minimum: 0, maximum: 1 }),
        biome: choice('off', ['off', 'on']),
        biomeSeaLevel: num(0, { minimum: -1000, maximum: 1000, ...M }),
        biomeLapseRate: num(0, { minimum: 0, maximum: 1 }),
        tileSize: num(10, { minimum: 1, maximum: 1000, ...M }),
        lodLevels: num(5, { minimum: 1, maximum: 12 }),
        splitFactor: num(2, { minimum: 2, maximum: 8 }),
        // 0 is AUTO on all of these — the device tier decides.
        hiResSubdivisions: num(0, { minimum: 0, maximum: 256 }),
        poolSize: num(0, { minimum: 0, maximum: 4096 }),
        fillBudget: num(0, { minimum: 0, maximum: 512 }),
        reach: num(0, { minimum: 0, maximum: 10000, ...M }),
        tileBuildMs: num(0, { minimum: 0, maximum: 100, ...MS }),
        majorRadius: num(100, { minimum: 1, maximum: 100000, ...M }),
        minorRadius: num(40, { minimum: 1, maximum: 100000, ...M }),
        radius: num(200, { minimum: 1, maximum: 1000000, ...M }),
        cylinderHeight: num(200, { minimum: 1, maximum: 100000, ...M }),
        originResetThreshold: num(500, { minimum: 1, maximum: 100000, ...M }),
        maxTravelDistance: num(5000, { minimum: 1, maximum: 1000000, ...M }),
        center: bool(false),
        wireframe: bool(false),
        debugColor: bool(false),
        profile: bool(false),
    }, extra);
}
/**
 * `b3d-reflections` — dynamic probes for `_mirror` meshes.
 *
 * Every knob here is a COST dial, which is why they all carry ranges: a probe
 * renders six faces, and `refreshRate` is how many frames it may skip between
 * doing so. See TODO's arbitration note before turning these up in content a
 * consumer inserts.
 */
export function reflectionsSchema(extra = {}) {
    return schema('Reflections', {
        // 0 is AUTO — resolved against the device tier.
        probeSize: num(0, { minimum: 0, maximum: 2048 }),
        refreshRate: num(5, { minimum: 1, maximum: 120 }),
        farRefreshRate: num(30, { minimum: 1, maximum: 600 }),
        maxDistance: num(100, { minimum: 1, maximum: 10000, ...M }),
        farDistance: num(30, { minimum: 1, maximum: 10000, ...M }),
        distanceCheckInterval: num(13, { minimum: 1, maximum: 240 }),
    }, extra);
}
/** Every scene-primitive schema, by the element name a consumer would use. */
export const sceneSchemas = {
    skybox: skyboxSchema,
    sun: sunSchema,
    water: waterSchema,
    fog: fogSchema,
    clouds: cloudsSchema,
    ambient: ambientSchema,
    light: hemisphericLightSchema,
    ground: groundSchema,
    terrain: terrainSchema,
    reflections: reflectionsSchema,
};
//# sourceMappingURL=scene-schemas.js.map