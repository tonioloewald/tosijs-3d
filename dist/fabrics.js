/*
How fabrics take light, as data: no Babylon, so a material recipe can offer
them as presets headlessly. `cloth-shading` applies them to a material; the
material picker shows them as a collection.
*/
/** Fabric presets, by how they take light. */
export const FABRICS = Object.freeze({
    cotton: { roughness: 0.85, sheen: 0.25, sheenRoughness: 0.6 },
    denim: { roughness: 0.9, sheen: 0.15, sheenRoughness: 0.7 },
    wool: { roughness: 0.95, sheen: 0.45, sheenRoughness: 0.5 },
    linen: { roughness: 0.9, sheen: 0.2, sheenRoughness: 0.65 },
    velvet: { roughness: 0.9, sheen: 0.9, sheenRoughness: 0.25 },
    silk: { roughness: 0.4, sheen: 0.55, sheenRoughness: 0.3 },
    satin: { roughness: 0.28, sheen: 0.75, sheenRoughness: 0.2 },
    synthetic: { roughness: 0.55, sheen: 0.2, sheenRoughness: 0.5 },
    leather: { roughness: 0.45, sheen: 0, sheenRoughness: 0.5 },
    rubber: { roughness: 0.6, sheen: 0, sheenRoughness: 0.5 },
    // Glossy plastic: the 1950s space suit.
    vinyl: { roughness: 0.12, sheen: 0, sheenRoughness: 0.5 },
    // Metals reflect the scene's environment (see environment's studioEnvironment).
    'silver lamé': {
        roughness: 0.3,
        metallic: 0.85,
        sheen: 0.35,
        sheenRoughness: 0.3,
    },
    foil: {
        roughness: 0.12,
        metallic: 1,
        sheen: 0,
        sheenRoughness: 0.5,
        tint: '#d8dade',
    },
    chrome: {
        roughness: 0.06,
        metallic: 1,
        sheen: 0,
        sheenRoughness: 0.5,
        tint: '#e8e8ea',
    },
    'brushed steel': {
        roughness: 0.38,
        metallic: 1,
        sheen: 0,
        sheenRoughness: 0.5,
        tint: '#b8babd',
    },
    gold: {
        roughness: 0.2,
        metallic: 1,
        sheen: 0,
        sheenRoughness: 0.5,
        tint: '#e8c065',
    },
    copper: {
        roughness: 0.25,
        metallic: 1,
        sheen: 0,
        sheenRoughness: 0.5,
        tint: '#d08a5c',
    },
});
//# sourceMappingURL=fabrics.js.map