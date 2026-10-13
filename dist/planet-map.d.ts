import { type PlanetSurface } from './sphere-map.js';
export interface HeightMap {
    width: number;
    height: number;
    /** Row by row from the top, one value a pixel. */
    data: Uint16Array;
}
/**
 * Read a 16-bit greyscale PNG. Throws, by name, for anything else: a height
 * map misread as eight bits or as colour still looks like terrain.
 */
export declare function decodeGray16Png(bytes: Uint8Array): HeightMap;
export interface MapSurfaceOptions {
    /** The body's radius, metres. */
    radius: number;
    /** Height of the datum or sea, metres. Default 0. */
    seaLevel?: number;
    /** Nothing is reported lower than this (metres). */
    floor?: number;
    /** What a pixel value of 0 means in metres. Default −32768. */
    offset?: number;
}
/**
 * A decoded height map as a surface. Between pixels it blends the four
 * around the point; east of the last column is the first (the date line),
 * and past a pole it holds the pole's row.
 */
export declare function mapSurface(map: HeightMap, options: MapSurfaceOptions): PlanetSurface;
/**
 * Fetch a height map and return it as a surface. The radius comes from
 * `options.radius`, else the response's `body-radius-km` header (the maps on
 * the CDN carry it); with neither, it throws rather than guess a planet.
 */
export declare function loadPlanetMap(url: string, options?: Partial<MapSurfaceOptions>): Promise<PlanetSurface>;
//# sourceMappingURL=planet-map.d.ts.map