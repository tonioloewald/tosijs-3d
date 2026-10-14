export interface Vec3 {
    x: number;
    y: number;
    z: number;
}
/** How a terrain's sheet is laid on its sphere. */
export interface SphereFrame {
    /** The planet's radius, metres (the terrain's `radius`). */
    radius: number;
    /** Where the terrain's origin sits, as fractions of a turn (its `worldU`/`worldV`). */
    worldU: number;
    worldV: number;
}
/**
 * A world's surface as a globe needs it: how high the ground is in any
 * direction from the centre. A terrain in sphere mode hands one out
 * (`terrain.planetSurface()`), and `<tosi-b3d-planet>` draws from it, which
 * is what makes the planet you see from orbit the one you land on.
 */
export interface PlanetSurface {
    /** The planet's true radius, metres. */
    radius: number;
    /** Height of the sea (or of the datum, on a dry world), metres. */
    seaLevel: number;
    /** Ground height in metres, in a direction from the centre (any length). */
    heightAt(direction: Vec3): number;
    /**
     * The ground's climate, in metres (a terrain's `biomePlugin.params`). A
     * planet with `biome="on"` shades from it, so the globe is coloured as the
     * ground is. Read every frame, so changing the ground changes the globe.
     */
    climate?: SurfaceClimate;
    /** The ground's biome colours (the plugin's `palette` and `paletteB`), now. */
    palettes?: () => {
        palette: number[][];
        paletteB: number[][];
    };
}
/** The climate settings a globe takes from the ground it is a globe of. */
export interface SurfaceClimate {
    equatorTemp: number;
    temperateTemp: number;
    poleTemp: number;
    lapseRate: number;
    mapMoisture: number;
    tNoiseScale: number;
    tNoiseAmp: number;
    mNoiseScale: number;
    mNoiseAmp: number;
    latWarpScale: number;
    latWarpAmp: number;
    moistureDryHeight: number;
    rainShadow: number;
    windAzimuth: number;
    volcanism: number;
    volcanicScale: number;
    season: number;
    seasonality: number;
}
/**
 * A ground climate (metres) as a globe of `globeRadius` units needs it, the
 * globe's relief exaggerated `relief` times. Noise is read at the same place
 * on both, so its scale is per unit of the globe; heights are stretched by
 * the relief, so what is measured against height is too.
 */
export declare function climateForGlobe(climate: SurfaceClimate, trueRadius: number, globeRadius: number, relief?: number): SurfaceClimate;
/** Fractions of a turn (u east, v from the north pole down) to a unit vector. */
export declare function uvToDirection(u: number, v: number): Vec3;
/** A direction (any length) to fractions of a turn; `u` in 0…1, `v` in 0…1. */
export declare function directionToUv(d: Vec3): {
    u: number;
    v: number;
};
/** Latitude and longitude in degrees to a unit vector. North is +Y. */
export declare function latLonToDirection(lat: number, lon: number): Vec3;
/** A direction to latitude (−90…90) and longitude (−180…180), degrees. */
export declare function directionToLatLon(d: Vec3): {
    lat: number;
    lon: number;
};
/**
 * Metres on the ground to the TERRAIN SAMPLER's fractions of a turn: its own
 * `(u, v)`, in which `v` grows with `z`. Not a latitude: see the note on the
 * mirror below, and use `groundToLatLon` for a place.
 */
export declare function groundToUv(x: number, z: number, frame: SphereFrame): {
    u: number;
    v: number;
};
/**
 * Fractions of a turn to metres on the ground. Going east wraps, so `x` is
 * the NEAREST copy of that longitude: never more than half way round.
 */
export declare function uvToGround(u: number, v: number, frame: SphereFrame): {
    x: number;
    z: number;
};
/** Where on the globe a spot on the ground is. */
export declare function groundToDirection(x: number, z: number, frame: SphereFrame): Vec3;
/** Where on the ground a direction on the globe is. */
export declare function directionToGround(d: Vec3, frame: SphereFrame): {
    x: number;
    z: number;
};
export declare function groundToLatLon(x: number, z: number, frame: SphereFrame): {
    lat: number;
    lon: number;
};
export declare function latLonToGround(lat: number, lon: number, frame: SphereFrame): {
    x: number;
    z: number;
};
//# sourceMappingURL=sphere-map.d.ts.map