import type { CityLayout } from './city-layout.js';
import { PRNG } from './mersenne-twister.js';
import { type Quat, type VehicleSpec, type VehicleState } from './ground-vehicle.js';
/** A city car as a body: Kenney's car kit at 1.7, roughly. Its origin is on the ground. */
export declare const TRAFFIC_CAR: VehicleSpec;
export interface TrafficOptions {
    layout: CityLayout;
    /** Metres a cell. */
    cell: number;
    /** How far right of the road's middle a lane's centre is, metres. */
    lane: number;
    count: number;
    seed?: number;
    /** How many kinds of car to choose from (`car.model` is 0 to `models` - 1). */
    models?: number;
    /** Metres a second on a straight. Default 9 (about 32 km/h). */
    maxSpeed?: number;
    /** Metres a second in a turn. Default 4. */
    turnSpeed?: number;
    /** m/s². Defaults 2.5 and 6. */
    accel?: number;
    brake?: number;
    /** Metres left between a car and what it stops behind. Default 2. */
    gap?: number;
    /** A car's length and width, metres. Defaults 4.6 and 2.2. */
    length?: number;
    width?: number;
    /** How far in from a kerb that borders no road a car's middle must stay, metres. Default 1.4. */
    kerb?: number;
    /** Nowhere to put a car at the start (the player's car). */
    clear?: {
        x: number;
        z: number;
        radius: number;
    };
    /** Drive each car as a body on this spec (see `TRAFFIC_CAR`). Absent: the cars follow their plans exactly. */
    vehicle?: VehicleSpec;
}
export interface TrafficCar {
    model: number;
    /** The plan: the cell it is driving through, and which way (0 n, 1 e, 2 s, 3 w) it came in and goes out. */
    cx: number;
    cz: number;
    dirIn: number;
    dirOut: number;
    /** Metres along this cell's path, and the path's length. */
    s: number;
    length: number;
    /** The plan's speed. */
    speed: number;
    /** Seconds it has been held up. */
    waited: number;
    /** The plan's point and heading. */
    px: number;
    pz: number;
    pyaw: number;
    /** Where the car is (metres, the city's frame) and which way it faces. */
    x: number;
    y: number;
    z: number;
    yaw: number;
    /** Its full turn (a body tips and rolls), the `ground-vehicle` convention. */
    orientation: Quat;
    /** True while it brakes (for brake lights). */
    braking: boolean;
    /** The body, when it drives as one. */
    body: VehicleState | null;
    /** Seconds it has been lost (far from its plan, or on its side). */
    lost: number;
    /** Seconds left backing away from a car it is jammed against. */
    backing: number;
    /** The car it is stopped for, if it is stopped for one. */
    waitingFor: TrafficCar | null;
    /** A car that has backed off to let this one through, ignored while `goFirst` lasts. */
    through: TrafficCar | null;
    goFirst: number;
    /** Its pedal, -1 to 1 (for the engine's note). */
    throttle: number;
    /** True on the step it sounds its horn. */
    honk: boolean;
    /** Seconds it has been held up by the same thing, and until it may honk again. */
    patience: number;
    hornIn: number;
    /** Seconds since it last got 3 m anywhere, and where it was then. */
    stuck: number;
    anchor: [number, number];
    /** The path through this cell: a quadratic curve. */
    path: [number, number, number, number, number, number];
}
export interface Traffic {
    cars: TrafficCar[];
    /** The recycler's allowance (see `recycleTraffic`). */
    recycle?: number;
    options: Required<Omit<TrafficOptions, 'clear' | 'vehicle'>> & {
        vehicle?: VehicleSpec;
    };
    rng: PRNG;
}
/** Something in the road that is not traffic: the player's car. */
export interface TrafficObstacle {
    x: number;
    z: number;
    /** Facing, radians; with `length` it is a car-shaped capsule, else a circle of `radius`. */
    yaw?: number;
    length?: number;
    width?: number;
    radius?: number;
    /** Its velocity, so a car it hits is pushed. */
    vx?: number;
    vz?: number;
    /**
     * Its body (the player's car): then a collision is two-way, and the body is
     * pushed and turned too, by its `mass`. Its position may be in another frame
     * (the world's); only `x`, `z` are read for where it is.
     */
    body?: VehicleState;
    mass?: number;
}
export declare function createTraffic(options: TrafficOptions): Traffic;
/** Where the player is looking from, in the city's frame: a point and a unit direction on the ground. */
export interface TrafficViewer {
    x: number;
    z: number;
    fx: number;
    fz: number;
}
export interface RecycleOptions {
    /** Beyond this a car is recycled, seen or not. Metres, default 160. */
    far?: number;
    /** Out of view and beyond this, it is recycled. Default 60. */
    hidden?: number;
    /** A new car appears out of view between these distances. Defaults 50 and 110. */
    spawnMin?: number;
    spawnMax?: number;
    /** In view: within this cosine of the view direction. Default 0.3 (about 70° either side). */
    view?: number;
    /** At most this many a second. Default 4. */
    perSecond?: number;
}
export declare function recycleTraffic(t: Traffic, viewer: TrafficViewer, dt: number, options?: RecycleOptions): number;
/** Advance every car by `dt` seconds. `obstacles` are things in the road to stop for (and bounce off). */
export declare function stepTraffic(t: Traffic, dt: number, obstacles?: TrafficObstacle[]): void;
//# sourceMappingURL=city-traffic.d.ts.map