export interface Vec3 {
    x: number;
    y: number;
    z: number;
}
export interface MoonLight {
    /** Toward the light (the chosen moon), or null when no moon is up. */
    dir: Vec3 | null;
    /** 0..1: the lit fraction of the chosen moon's face. */
    strength: number;
    /** Which of `moons` it is, -1 for none. */
    index: number;
}
/** The night light from moons at `moons` with the real sun at `sun`. */
export declare function moonLight(moons: Vec3[], sun: Vec3): MoonLight;
//# sourceMappingURL=moon-light.d.ts.map