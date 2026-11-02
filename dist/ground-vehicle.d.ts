export interface Vec3 {
    x: number;
    y: number;
    z: number;
}
export interface Quat {
    x: number;
    y: number;
    z: number;
    w: number;
}
export interface Suspension {
    /** How far a wheel moves up or down from where it sits at rest, metres. */
    travel: number;
    /** How quickly it bounces, Hz: 1 is a soft car, 2 a firm one. */
    frequency: number;
    /** 0 bounces forever, 1 never overshoots. */
    damping: number;
}
export interface WheelSpec {
    /** The hub when the vehicle stands still, in its frame (+Z forward, +Y up). */
    at: Vec3;
    radius: number;
    /** How far it steers at full lock, degrees. 0 (the default) does not steer. */
    steerDeg?: number;
    /** Its share of the engine (shares are relative). 0 (the default) is not driven. */
    drive?: number;
    /** Its share of the brakes, relative. Default 1. */
    brake?: number;
    /** Locked by the handbrake. Default: the wheels behind the centre. */
    handbrake?: boolean;
}
export interface TrackSpec {
    /** Points under the track where it meets the ground, in the vehicle's frame. */
    contacts: Vec3[];
    /** The road wheels' radius: how far a contact's hub sits above the ground. */
    radius: number;
    /**
     * Points at the track's raised ends (its idler and sprocket). They reach
     * nothing on the flat and carry none of the weight; meeting the top of an
     * obstacle, they push that end of the track up onto it, so a tank climbs a
     * step about as high as its track instead of stopping at it.
     */
    climb?: Vec3[];
}
export interface VehicleSpec {
    /** kg */
    mass: number;
    /** The body as a box, metres, for how it turns (its inertia). */
    size: Vec3;
    /** Where the mass is, in the vehicle's frame. Default the origin. */
    centreOfMass?: Vec3;
    wheels?: WheelSpec[];
    tracks?: TrackSpec[];
    suspension?: Partial<Suspension>;
    /** The engine's pull at a standstill, newtons. */
    engineForce: number;
    /** All the brakes together, newtons. */
    brakeForce: number;
    /** m/s; the engine gives nothing past it. */
    maxSpeed: number;
    /** m/s backwards. Default a third of `maxSpeed`. */
    reverseSpeed?: number;
    /** How much the tyres or tracks hold, as a friction coefficient. Default 1. */
    grip?: number;
    /** Air drag, newtons per (m/s)². Default 0.4. */
    drag?: number;
    /** Rolling resistance, as a share of the load. Default 0.015. */
    rolling?: number;
    /** Off the throttle at speed, how hard the engine slows it, m/s². Default 1. */
    coast?: number;
    /** Tracks: how far apart the belts run at full steer, m/s. Default 1.2. */
    turnSpeed?: number;
}
export interface VehicleControls {
    /** -1..1: forward goes, back brakes and then reverses. */
    throttle: number;
    /** -1..1: positive turns toward +X (right). */
    steer: number;
    /** 0..1 */
    handbrake?: number;
}
export interface GroundHit {
    /** Along the ray, metres. */
    distance: number;
    /** The ground's normal there, unit. */
    normal: Vec3;
}
/** Where a ray meets the ground, or null. `dir` is unit. */
export type GroundRay = (from: Vec3, dir: Vec3, length: number) => GroundHit | null;
export interface ContactState {
    grounded: boolean;
    /** Spring compression from where it sits at rest, metres (+ is up). */
    compression: number;
    /** The load it carries, newtons. */
    load: number;
    /** How fast the wheel turns, radians per second. */
    spin: number;
    /** How far it has turned, radians: for drawing. */
    angle: number;
    /** Its steering angle now, radians. */
    steer: number;
    /** True while it slides (past its grip). */
    sliding: boolean;
}
export interface TrackState {
    /** The belt's speed, m/s. */
    speed: number;
    /** How far the belt has run, metres: for scrolling a tread. */
    offset: number;
    contacts: ContactState[];
}
export interface VehicleState {
    position: Vec3;
    orientation: Quat;
    velocity: Vec3;
    /** World frame, radians per second. */
    angularVelocity: Vec3;
    wheels: ContactState[];
    tracks: TrackState[];
    /** Time not yet stepped (the fixed step's remainder). */
    carry: number;
}
export declare const VEHICLE_STEP: number;
/** `a` rotated by the unit quaternion `q`. */
export declare function rotate(q: Quat, a: Vec3): Vec3;
/** A turn about +Y, as a quaternion (the convention `rotate` uses). */
export declare function yawQuat(radians: number): Quat;
/** The vehicle's heading, radians: 0 faces +Z, positive turns toward +X. */
export declare function headingOf(state: VehicleState): number;
/** Speed along the vehicle's nose, m/s (negative backing up). */
export declare function forwardSpeed(state: VehicleState): number;
/**
 * A ground from a height function (pure: for tests, and for terrain known
 * only as heights). Rays are marched and then bisected, so a ray that grazes
 * a hill may miss a narrow peak; fine for wheels.
 */
export declare function heightGround(heightAt: (x: number, z: number) => number): GroundRay;
/** A vehicle standing at `position` (its origin), facing `headingDeg`. */
export declare function createVehicle(spec: VehicleSpec, place: {
    position: Vec3;
    headingDeg?: number;
}): VehicleState;
/** Move a vehicle by a floating-origin shift (or a teleport), keeping its motion. */
export declare function shiftVehicle(state: VehicleState, dx: number, dy: number, dz: number): void;
/**
 * Advance a vehicle by `dt` seconds of world time. Steps at a fixed
 * {@link VEHICLE_STEP}, carrying the remainder, so a frame rate does not
 * change the drive. Mutates `state` and returns it.
 */
export declare function stepVehicle(spec: VehicleSpec, state: VehicleState, controls: VehicleControls, dt: number, ground: GroundRay): VehicleState;
/** Where a chase camera sits, in metres, for a vehicle of a given size. */
export interface ChaseRig {
    /** How far from the pivot it sits, at rest. */
    distance: number;
    /** Kept for callers: the eye's height at rest. */
    height: number;
    /** Unused since the camera looks at its pivot; kept for callers. */
    ahead: number;
    /** The aim point's height above the vehicle's origin (the pivot). */
    aimHeight: number;
}
export declare function chaseRigFor(size: Vec3, scale?: number): ChaseRig;
/** The chase boom's resting setting: a little up from close behind. */
export declare const CHASE_BOOM = 0.3;
/**
 * The camera's eye and aim point. The camera PIVOTS round a point a little
 * above the vehicle (`rig.aimHeight`) and looks at it, so it looks over the
 * vehicle at the road beyond. `yaw` is the direction it faces (the heading
 * plus any orbit). `boom` in 0…1 moves it along an arc: 0 close behind and
 * low, `CHASE_BOOM` at rest, 1 further out and up to almost above, a little
 * behind. `lift` (radians) raises it further up the same arc, which is how
 * the camera gets out of a wall.
 */
export declare function chasePose(at: Vec3, yaw: number, boom: number, rig: ChaseRig, lift?: number): {
    eye: Vec3;
    target: Vec3;
};
//# sourceMappingURL=ground-vehicle.d.ts.map