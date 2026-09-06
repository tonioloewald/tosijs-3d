/** A wind vector in world XZ, in metres per second. */
export interface Wind {
    x: number;
    z: number;
}
/** The identity — no wind, and what an absent province contributes. */
export declare const NO_WIND: Wind;
/**
 * Build a wind from speed and bearing.
 *
 * Bearing is where the wind is GOING, north-up and clockwise: `0` blows toward
 * +Z, `90` toward +X. Same sense as `angle3d`, so a dial wired to this points
 * where the weather goes.
 */
export declare function windFromPolar(speed: number, bearingDeg: number): Wind;
/** Speed and bearing of a wind. Bearing is `0..360`, and `0` for a dead calm. */
export declare function windToPolar(wind: Wind): {
    speed: number;
    bearingDeg: number;
};
/** Add winds. The whole composition rule. */
export declare function addWind(...winds: Wind[]): Wind;
export declare const scaleWind: (wind: Wind, k: number) => Wind;
export declare const windSpeed: (wind: Wind) => number;
/**
 * A province's wind layer: a contribution, and how far it reaches.
 *
 * The contribution is what this province adds AT ITS CENTRE; `falloff` scales
 * it out to the rim. Absent falloff means a smooth shoulder — the same
 * smoothstep every other province layer defaults to, so a lee does not have a
 * hard edge you can walk across.
 */
export interface ProvinceWind {
    /** Where it acts, in world XZ. */
    at: {
        x: number;
        z: number;
    };
    /** How far its influence reaches, in metres. */
    radius: number;
    /** What it adds at the centre. */
    contribution: Wind;
    /**
     * Influence by normalised distance — `0` at the centre, `1` at the rim.
     *
     * Same `t` every other province layer reads, which is what keeps the layers
     * from disagreeing by accident (PROVINCE-DESIGN: "they are all speaking the
     * same coordinates").
     */
    falloff?: (t: number) => number;
}
/** How strongly a province acts at a point. `0` outside its radius. */
export declare function provinceInfluence(province: ProvinceWind, x: number, z: number): number;
/**
 * The wind at a point: the base, plus every province that reaches it.
 *
 * Vector addition, exactly as temperature and water sum in
 * [[province-climate]]. A province out of range contributes the zero vector, so
 * a scene with no provinces costs one loop over an empty array.
 */
export declare function windAt(base: Wind, provinces: readonly ProvinceWind[], x: number, z: number): Wind;
/**
 * Gust: the steady wind plus a reproducible wander.
 *
 * `amount` is a fraction of the wind's own speed — `0.3` is a lively breeze,
 * `0` is dead steady. Two independent noise channels, so a gust can back and
 * veer as well as strengthen; one channel would only make the wind pulse along
 * its own axis, which reads as a fan rather than weather.
 *
 * Deterministic in `t` and `seed`: the same second of the same scene gives the
 * same gust, so a replay matches and a test can assert one.
 */
export declare function gustAt(wind: Wind, t: number, options?: {
    amount?: number;
    period?: number;
    seed?: number;
}): Wind;
/**
 * Wind in the spelling `b3d-water` wants.
 *
 * `WaterMaterial` takes a `windForce` and a 2D `windDirection`, where the
 * direction is expected to be roughly unit-length — so the speed cannot simply
 * be folded into the vector.
 */
export declare function waterWind(wind: Wind): {
    windForce: number;
    windDirectionX: number;
    windDirectionY: number;
};
//# sourceMappingURL=wind.d.ts.map