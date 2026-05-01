/**
 * Pure aircraft force model — no Babylon dependencies, fully testable.
 *
 * All vectors are {x, y, z} plain objects. World space: Y is up.
 */
export type Vec3 = {
    x: number;
    y: number;
    z: number;
};
export type AircraftConfig = {
    maxSpeed: number;
    acceleration: number;
    vtolSpeed: number;
    stallSpeed: number;
};
export type AircraftAxes = {
    forward: Vec3;
    up: Vec3;
};
export type ForceResult = {
    /** Change to apply to velocity (add this to vel) */
    dv: Vec3;
    /** Whether VTOL mode is active */
    vtol: boolean;
    /** Airspeed (forward component of velocity) */
    airspeed: number;
};
/**
 * Compute the net force (as delta-velocity) for one simulation step.
 *
 * This is a pure function: it reads vel/axes/config and returns a dv
 * to add to velocity. It does NOT mutate vel.
 */
export declare function computeForces(vel: Vec3, axes: AircraftAxes, throttle: number, config: AircraftConfig, dt: number): ForceResult;
//# sourceMappingURL=aircraft-physics.d.ts.map