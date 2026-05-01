export interface Vec3 {
    x: number;
    y: number;
    z: number;
}
export interface SurfaceSampler {
    sample(u: number, v: number): Vec3;
    normal(u: number, v: number): Vec3;
}
export declare class TorusSampler implements SurfaceSampler {
    majorRadius: number;
    minorRadius: number;
    constructor(majorRadius?: number, minorRadius?: number);
    sample(u: number, v: number): Vec3;
    normal(u: number, v: number): Vec3;
}
/**
 * Cylinder sampler: u wraps seamlessly around the circumference,
 * v reflects at 0.5 to create a finite mirrored world (like a planet
 * with symmetric hemispheres). No singularities anywhere.
 *
 * For planet rendering, smooth noise to 0 near v=0 and v=0.5
 * to hide the mirror seam at poles.
 */
export declare class CylinderSampler implements SurfaceSampler {
    radius: number;
    height: number;
    constructor(radius?: number, height?: number);
    sample(u: number, v: number): Vec3;
    normal(u: number, v: number): Vec3;
    /** Circumference in u direction */
    get circumferenceU(): number;
    /** Full height in v direction (only half is unique due to reflection) */
    get circumferenceV(): number;
}
export declare class SphereSampler implements SurfaceSampler {
    radius: number;
    constructor(radius?: number);
    sample(u: number, v: number): Vec3;
    normal(u: number, v: number): Vec3;
}
//# sourceMappingURL=surface-sampler.d.ts.map