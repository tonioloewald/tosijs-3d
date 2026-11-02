/*#
# city-traffic

**Cars that drive round a city by themselves**, on a plan from
[city-layout](/city-layout/). Pure and seeded: no Babylon, no clock (time is
the `dt` you step it by), so the same seed drives the same way in a test, a
replay or a headset. [b3d-city](/b3d-city/) draws it.

Each car has a **plan**: a point that drives one road cell at a time in the
right-hand lane, in from one side, out by another, along a curve when it turns.
Entering a cell it picks its way out (straight ahead three times as often as a
turn; back the way it came only at a dead end). It slows for a turn, and for
anything in the lane ahead: another car, or an `obstacle` you pass in (the
player's car). At a junction where two cars each wait on the other, the one
that has waited longer creeps on, so a crossroads cannot lock up for good.

Given a `vehicle` spec, each car is also a real **body** on the
[ground-vehicle](/ground-vehicle/) model, the one your car drives on:
suspension, tyres that grip until they slide, mass. It steers and works its
pedals to follow its plan, which waits for it when it falls behind. Cars that
touch push each other and spin (an impulse at the point of contact, mass and
turning inertia included), and so does an obstacle given as a `body` (the
player's car, which is knocked about in turn); two cars jammed nose to nose
sort it out by one backing away; a kerb that borders no road keeps them out of the
buildings; a car knocked far from its lane or onto its roof for a few seconds
is put back on its plan. Without a `vehicle` the plan is the car.

A car held up by an obstacle (you) honks after a second or so, and again every
few seconds you stay; held up a long time by a car that is going nowhere, now
and then. `car.honk` is true on the step it does, for whoever plays the sound.

`recycleTraffic(traffic, viewer, dt)` keeps the cars where the player is, the
GTA way: `count` is a budget, and a car that is far away, or out of view and
not close, is taken away and put back out of view a block or so off, already
driving toward the player. Turn round and the street behind you has traffic
again; a jam nobody is watching clears itself.

```javascript
const traffic = createTraffic({ layout, cell: 12, lane: 1.4, count: 24, seed: 1, vehicle: TRAFFIC_CAR })
// every frame:
stepTraffic(traffic, dt, [{ x, z, yaw, vx, vz, length: 4.6, width: 2.2 }])
for (const car of traffic.cars) draw(car.model, car.x, car.y, car.z, car.orientation)
```

Positions are metres in the city's frame (the grid centred on its origin, as
`b3d-city` lays it out); `yaw` is radians, 0 facing +Z (north).
*/
/*{ "parent": "terrain", "order": 62 }*/
import { PRNG } from './mersenne-twister.js';
import { createVehicle, forwardSpeed, headingOf, rotate, stepVehicle, yawQuat, } from './ground-vehicle.js';
/** n, e, s, w as unit steps on the grid, and their mask bits. */
const DIR = [
    [0, 1],
    [1, 0],
    [0, -1],
    [-1, 0],
];
const BIT = [1, 2, 4, 8];
/** A city car as a body: Kenney's car kit at 1.7, roughly. Its origin is on the ground. */
export const TRAFFIC_CAR = {
    mass: 1200,
    size: { x: 2.2, y: 1.6, z: 4.6 },
    centreOfMass: { x: 0, y: 0.6, z: 0 },
    wheels: [
        { at: { x: -0.85, y: 0.4, z: 1.4 }, radius: 0.4, steerDeg: 32 },
        { at: { x: 0.85, y: 0.4, z: 1.4 }, radius: 0.4, steerDeg: 32 },
        { at: { x: -0.85, y: 0.4, z: -1.4 }, radius: 0.4, drive: 1 },
        { at: { x: 0.85, y: 0.4, z: -1.4 }, radius: 0.4, drive: 1 },
    ],
    engineForce: 6000,
    brakeForce: 14000,
    maxSpeed: 16,
};
/** Flat ground at y = 0. */
const FLAT = (from, dir, length) => {
    if (dir.y >= 0 || from.y < 0)
        return null;
    const t = from.y / -dir.y;
    return t <= length ? { distance: t, normal: { x: 0, y: 1, z: 0 } } : null;
};
function isRoad(layout, x, z) {
    return (x >= 0 &&
        z >= 0 &&
        x < layout.width &&
        z < layout.depth &&
        layout.road[z * layout.width + x]);
}
function maskAt(layout, x, z) {
    let m = 0;
    for (let i = 0; i < 4; i++)
        if (isRoad(layout, x + DIR[i][0], z + DIR[i][1]))
            m |= BIT[i];
    return m;
}
/** The way out of a cell for a car that came in heading `dirIn`. */
function chooseExit(layout, x, z, dirIn, rng) {
    const mask = maskAt(layout, x, z);
    const back = (dirIn + 2) % 4;
    const ways = [];
    for (let d = 0; d < 4; d++) {
        if (d === back || !(mask & BIT[d]))
            continue;
        ways.push({ dir: d, weight: d === dirIn ? 3 : 1 });
    }
    if (ways.length === 0)
        return back;
    let r = rng.value() * ways.reduce((t, w) => t + w.weight, 0);
    for (const w of ways) {
        r -= w.weight;
        if (r <= 0)
            return w.dir;
    }
    return ways[ways.length - 1].dir;
}
/** The curve through cell (x, z): in on the right of `dirIn`, out on the right of `dirOut`. */
function cellPath(t, car) {
    const { layout, cell, lane } = t.options;
    const mx = (car.cx + 0.5 - layout.width / 2) * cell;
    const mz = (car.cz + 0.5 - layout.depth / 2) * cell;
    const [ix, iz] = DIR[car.dirIn];
    const [ox, oz] = DIR[car.dirOut];
    const [rix, riz] = DIR[(car.dirIn + 1) % 4];
    const [rox, roz] = DIR[(car.dirOut + 1) % 4];
    const half = cell / 2;
    const p0x = mx - ix * half + rix * lane;
    const p0z = mz - iz * half + riz * lane;
    const p1x = mx + ox * half + rox * lane;
    const p1z = mz + oz * half + roz * lane;
    const straight = car.dirIn === car.dirOut;
    // A turn's corner is where its two lanes cross; a straight's, its middle.
    const cx = straight ? (p0x + p1x) / 2 : mx + (rix + rox) * lane;
    const cz = straight ? (p0z + p1z) / 2 : mz + (riz + roz) * lane;
    car.path = [p0x, p0z, cx, cz, p1x, p1z];
    // The length, measured along the curve.
    let len = 0;
    let px = p0x;
    let pz = p0z;
    for (let i = 1; i <= 8; i++) {
        const [x, z] = curveAt(car.path, i / 8);
        len += Math.hypot(x - px, z - pz);
        px = x;
        pz = z;
    }
    car.length = Math.max(0.5, len);
}
function curveAt(p, u) {
    const a = (1 - u) * (1 - u);
    const b = 2 * (1 - u) * u;
    const c = u * u;
    return [a * p[0] + b * p[2] + c * p[4], a * p[1] + b * p[3] + c * p[5]];
}
/** Put the plan's point where its `s` says. */
function placePlan(car) {
    const u = Math.min(1, Math.max(0, car.s / car.length));
    const p = car.path;
    [car.px, car.pz] = curveAt(p, u);
    // The tangent: 2(1-u)(C-P0) + 2u(P1-C).
    const dx = (1 - u) * (p[2] - p[0]) + u * (p[4] - p[2]);
    const dz = (1 - u) * (p[3] - p[1]) + u * (p[5] - p[3]);
    if (dx !== 0 || dz !== 0)
        car.pyaw = Math.atan2(dx, dz);
}
/** The car's pose from its body, or from its plan when it has none. */
function placeCar(car) {
    const b = car.body;
    if (b) {
        car.x = b.position.x;
        car.y = b.position.y;
        car.z = b.position.z;
        car.yaw = headingOf(b);
        car.orientation = b.orientation;
    }
    else {
        car.x = car.px;
        car.y = 0;
        car.z = car.pz;
        car.yaw = car.pyaw;
        car.orientation = yawQuat(car.pyaw);
    }
}
function newBody(spec, car) {
    return createVehicle(spec, {
        position: { x: car.px, y: 0, z: car.pz },
        headingDeg: (car.pyaw * 180) / Math.PI,
    });
}
export function createTraffic(options) {
    const opts = {
        seed: 1,
        models: 1,
        maxSpeed: 9,
        turnSpeed: 4,
        accel: 2.5,
        brake: 6,
        gap: 2,
        length: 4.6,
        width: 2.2,
        kerb: 1.4,
        ...options,
    };
    const { clear, ...rest } = opts;
    const t = {
        cars: [],
        options: rest,
        rng: new PRNG(opts.seed * 104729 + 7),
    };
    const { layout } = opts;
    // One car to a cell at most, never by the clear spot.
    const cells = layout.roads.filter((r) => {
        if (clear == null)
            return true;
        const x = (r.x + 0.5 - layout.width / 2) * opts.cell;
        const z = (r.z + 0.5 - layout.depth / 2) * opts.cell;
        return Math.hypot(x - clear.x, z - clear.z) > clear.radius + opts.cell;
    });
    for (let i = cells.length - 1; i > 0; i--) {
        const j = Math.floor(t.rng.value() * (i + 1));
        [cells[i], cells[j]] = [cells[j], cells[i]];
    }
    for (const r of cells.slice(0, Math.max(0, opts.count))) {
        // Come in from any road side, heading away from it.
        const from = [0, 1, 2, 3].filter((d) => r.mask & BIT[(d + 2) % 4]);
        const dirIn = from.length
            ? from[Math.floor(t.rng.value() * from.length)]
            : 0;
        const car = {
            model: Math.floor(t.rng.value() * opts.models),
            cx: r.x,
            cz: r.z,
            dirIn,
            dirOut: chooseExit(layout, r.x, r.z, dirIn, t.rng),
            s: 0,
            length: 1,
            speed: 0,
            waited: 0,
            px: 0,
            pz: 0,
            pyaw: 0,
            x: 0,
            y: 0,
            z: 0,
            yaw: 0,
            orientation: { x: 0, y: 0, z: 0, w: 1 },
            braking: false,
            body: null,
            lost: 0,
            backing: 0,
            waitingFor: null,
            through: null,
            goFirst: 0,
            throttle: 0,
            honk: false,
            patience: 0,
            hornIn: 0,
            stuck: 0,
            anchor: [0, 0],
            path: [0, 0, 0, 0, 0, 0],
        };
        cellPath(t, car);
        car.s = t.rng.value() * car.length * 0.5;
        placePlan(car);
        if (opts.vehicle)
            car.body = newBody(opts.vehicle, car);
        placeCar(car);
        t.cars.push(car);
    }
    return t;
}
/** How far a car's plan may run ahead of its body before it waits, metres. */
const LEAD = 12;
/*
THE CAR BUDGET, the GTA way: `count` cars, kept where the player is. A car that
is far away, or out of view and not close, goes, and comes back out of view a
block or so away, driving toward the player. Stuck cars nobody is watching go
the same way, so a jam out of sight clears itself.
*/
export function recycleTraffic(t, viewer, dt, options = {}) {
    const far = options.far ?? 160;
    const hidden = options.hidden ?? 60;
    const spawnMin = options.spawnMin ?? 50;
    const spawnMax = options.spawnMax ?? 110;
    const view = options.view ?? 0.3;
    const o = t.options;
    const { layout, cell } = o;
    const rate = options.perSecond ?? 4;
    t.recycle = Math.min(Math.max(2, rate), (t.recycle ?? 0) + dt * rate);
    const seen = (x, z) => {
        const dx = x - viewer.x;
        const dz = z - viewer.z;
        const d = Math.hypot(dx, dz);
        return d < 15 || (dx * viewer.fx + dz * viewer.fz) / d > view;
    };
    let n = 0;
    for (const car of t.cars) {
        if (t.recycle < 1)
            break;
        const d = Math.hypot(car.x - viewer.x, car.z - viewer.z);
        if (d < far && (d < hidden || seen(car.x, car.z)))
            continue;
        // A place for it: a road out of view at a block or so, with room.
        let spot = null;
        for (let tries = 0; tries < 40 && spot == null; tries++) {
            const r = layout.roads[Math.floor(t.rng.value() * layout.roads.length)];
            const x = (r.x + 0.5 - layout.width / 2) * cell;
            const z = (r.z + 0.5 - layout.depth / 2) * cell;
            const dr = Math.hypot(x - viewer.x, z - viewer.z);
            if (dr < spawnMin || dr > spawnMax || seen(x, z))
                continue;
            if (t.cars.some((c) => c !== car && Math.hypot(c.x - x, c.z - z) < cell))
                continue;
            // Heading toward the viewer, if the road allows.
            const ways = [0, 1, 2, 3].filter((dir) => r.mask & BIT[(dir + 2) % 4]);
            if (ways.length === 0)
                continue;
            const toward = ways.filter((dir) => DIR[dir][0] * (viewer.x - x) + DIR[dir][1] * (viewer.z - z) > 0);
            const pickFrom = toward.length ? toward : ways;
            spot = {
                x: r.x,
                z: r.z,
                dirIn: pickFrom[Math.floor(t.rng.value() * pickFrom.length)],
            };
        }
        if (spot == null)
            continue;
        car.cx = spot.x;
        car.cz = spot.z;
        car.dirIn = spot.dirIn;
        car.dirOut = chooseExit(layout, spot.x, spot.z, spot.dirIn, t.rng);
        cellPath(t, car);
        car.s = t.rng.value() * car.length * 0.3;
        placePlan(car);
        // Already driving: it was always there, you just had not seen it.
        car.speed = o.maxSpeed * 0.7;
        Object.assign(car, {
            waited: 0,
            lost: 0,
            backing: 0,
            stuck: 0,
            goFirst: 0,
            through: null,
            waitingFor: null,
        });
        if (o.vehicle) {
            car.body = newBody(o.vehicle, car);
            car.body.velocity = {
                x: Math.sin(car.pyaw) * car.speed,
                y: 0,
                z: Math.cos(car.pyaw) * car.speed,
            };
        }
        placeCar(car);
        car.anchor = [car.x, car.z];
        t.recycle -= 1;
        n++;
    }
    return n;
}
/** Advance every car by `dt` seconds. `obstacles` are things in the road to stop for (and bounce off). */
export function stepTraffic(t, dt, obstacles = []) {
    if (dt <= 0)
        return;
    const o = t.options;
    const cars = t.cars;
    const wants = cars.map((car) => {
        const hx = Math.sin(car.yaw);
        const hz = Math.cos(car.yaw);
        const speed = car.body ? Math.max(0, forwardSpeed(car.body)) : car.speed;
        const turning = car.dirIn !== car.dirOut;
        let want = turning ? o.turnSpeed : o.maxSpeed;
        // Look ahead along the heading for anything in the lane.
        const reach = (speed * speed) / (2 * o.brake) + o.gap + o.length * 2;
        let blocked = false;
        let blocker = null;
        let nearest = Infinity;
        // The nearest thing in the way, whatever it is (for the horn).
        let closest = Infinity;
        let closestIsObstacle = false;
        const consider = (x, z, size, crossing, other = null, obstacle = false) => {
            const rx = x - car.x;
            const rz = z - car.z;
            const along = rx * hx + rz * hz;
            if (along <= 0 || along > reach + size)
                return;
            const side = Math.abs(rx * hz - rz * hx);
            // A turning car sweeps wider: it looks into the lane it is joining.
            if (side > o.width * (turning ? 1.2 : 0.5) + size)
                return;
            // Two cars each waiting on the other across a junction: the one that
            // has waited long enough creeps on.
            if (crossing && car.waited > 2.5)
                return;
            const room = Math.max(0, along - size - o.length / 2 - o.gap);
            want = Math.min(want, Math.sqrt(2 * o.brake * room));
            if (room < closest) {
                closest = room;
                closestIsObstacle = obstacle;
            }
            if (room < 0.5)
                blocked = true;
            if (room < 0.5 && room < nearest) {
                nearest = room;
                blocker = other;
            }
        };
        if (car.goFirst > 0)
            car.goFirst -= dt;
        for (const other of cars) {
            if (other === car)
                continue;
            if (other === car.through && car.goFirst > 0)
                continue;
            const facing = Math.sin(other.yaw) * hx + Math.cos(other.yaw) * hz;
            // Oncoming traffic keeps to its own lane.
            if (facing < -0.7)
                continue;
            consider(other.x, other.z, o.length / 2, facing < 0.5 && other.waited > 1, other);
        }
        for (const ob of obstacles)
            consider(ob.x, ob.z, ob.length ? ob.length / 2 : ob.radius ?? 2, false, null, true);
        car.waited = blocked || speed < 0.3 ? car.waited + dt : 0;
        car.waitingFor = blocker;
        /*
        THE HORN: held up by YOU, a driver leans on it after a second or so, and
        again every few seconds you stay there. Held up by another car that is
        going nowhere, after a long wait, now and then.
        */
        car.honk = false;
        car.hornIn -= dt;
        // Held up: stopped, with something close ahead.
        const held = speed < 1 && closest < 3;
        car.patience = held ? car.patience + dt : 0;
        const fedUp = closestIsObstacle
            ? car.patience > 1.2
            : car.patience > 8 && car.stuck > 5;
        if (held && fedUp && car.hornIn <= 0) {
            car.honk = true;
            car.hornIn = closestIsObstacle
                ? 2.5 + t.rng.value() * 3
                : 8 + t.rng.value() * 10;
        }
        // JAMMED: two cars nose to nose or nose to side, both getting nowhere
        // (each creeping into the other; a bump is not progress). The later one
        // backs off, and the other goes first, paying it no mind until through.
        if (Math.hypot(car.x - car.anchor[0], car.z - car.anchor[1]) > 3) {
            car.anchor = [car.x, car.z];
            car.stuck = 0;
        }
        else
            car.stuck += dt;
        if (car.body && car.backing <= 0 && car.stuck > 5) {
            let partner = null;
            let best = 7;
            for (const other of cars) {
                if (other === car)
                    continue;
                const rx = other.x - car.x;
                const rz = other.z - car.z;
                const d = Math.hypot(rx, rz);
                if (d < best &&
                    rx * hx + rz * hz > 0 &&
                    Math.abs(rx * hz - rz * hx) < 3.5) {
                    best = d;
                    partner = other;
                }
            }
            // Whose nose is in whose side: that one backs; nose to nose, the later.
            const facesMe = (p) => {
                const rx = car.x - p.x;
                const rz = car.z - p.z;
                const px = Math.sin(p.yaw);
                const pz = Math.cos(p.yaw);
                return rx * px + rz * pz > 0 && Math.abs(rx * pz - rz * px) < 3.5;
            };
            if (partner &&
                partner.stuck > 3 &&
                partner.backing <= 0 &&
                (!facesMe(partner) || cars.indexOf(car) > cars.indexOf(partner))) {
                car.backing = 2;
                car.stuck = 0;
                partner.through = car;
                partner.goFirst = 6;
            }
        }
        return want;
    });
    // The plans: each eases toward its car's wanted speed, and waits for a body left behind.
    cars.forEach((car, i) => {
        let want = wants[i];
        if (car.body && Math.hypot(car.px - car.x, car.pz - car.z) > LEAD)
            want = 0;
        const dv = want - car.speed;
        car.speed = Math.max(0, car.speed + Math.max(-o.brake * dt, Math.min(o.accel * dt, dv)));
        car.s += car.speed * dt;
        while (car.s >= car.length) {
            car.s -= car.length;
            const [dx, dz] = DIR[car.dirOut];
            let nx = car.cx + dx;
            let nz = car.cz + dz;
            let dirIn = car.dirOut;
            if (!isRoad(o.layout, nx, nz)) {
                // Off the map (should not happen): turn round where it is.
                nx = car.cx;
                nz = car.cz;
                dirIn = (car.dirIn + 2) % 4;
            }
            car.cx = nx;
            car.cz = nz;
            car.dirIn = dirIn;
            car.dirOut = chooseExit(o.layout, nx, nz, dirIn, t.rng);
            cellPath(t, car);
        }
        placePlan(car);
    });
    const spec = o.vehicle;
    if (spec) {
        // The bodies: steer at the plan, drive to keep a little behind it.
        cars.forEach((car, i) => {
            const body = car.body;
            const dx = car.px - body.position.x;
            const dz = car.pz - body.position.z;
            const dist = Math.hypot(dx, dz);
            const heading = headingOf(body);
            let err = Math.atan2(dx, dz) - heading;
            err = Math.atan2(Math.sin(err), Math.cos(err));
            const fwd = forwardSpeed(body);
            const want = Math.min(wants[i], car.speed + 2, Math.max(0, (dist - 2) * 1.2));
            let throttle = Math.max(-1, Math.min(1, (want - fwd) * 0.6));
            // Never back up to reach a plan: brake, then hold.
            if (fwd < 0.5)
                throttle = Math.max(0, throttle);
            if (dist < 1)
                throttle = Math.min(throttle, 0);
            let steer = Math.max(-1, Math.min(1, err * 2.2));
            if (car.backing > 0) {
                // Reverse out, turning the tail away from where it wants to go.
                car.backing -= dt;
                throttle = -0.6;
                steer = -steer;
                car.waited = 0;
            }
            car.braking = throttle < -0.05 || (want < 0.3 && fwd < 1.5);
            car.throttle = throttle;
            stepVehicle(spec, body, { throttle, steer }, dt, FLAT);
        });
        collide(t, obstacles);
        cars.forEach((car) => {
            const body = car.body;
            kerb(t, body);
            // Lost: far from its plan, or not on its wheels. Put it back.
            const up = rotate(body.orientation, { x: 0, y: 1, z: 0 }).y;
            const far = Math.hypot(car.px - body.position.x, car.pz - body.position.z) >
                LEAD * 2.5;
            car.lost = far || up < 0.5 ? car.lost + dt : 0;
            if (car.lost > 3 || !Number.isFinite(body.position.x)) {
                car.body = newBody(spec, car);
                car.lost = 0;
            }
        });
    }
    else {
        cars.forEach((car, i) => (car.braking = wants[i] < car.speed - 0.5));
    }
    cars.forEach(placeCar);
}
function capsule(x, z, yaw, length, width) {
    const half = Math.max(0, length / 2 - width / 2);
    const fx = Math.sin(yaw) * half;
    const fz = Math.cos(yaw) * half;
    return { ax: x - fx, az: z - fz, bx: x + fx, bz: z + fz, r: width / 2 };
}
/** The closest points of two segments. */
function closest(p, q) {
    const d1x = p.bx - p.ax;
    const d1z = p.bz - p.az;
    const d2x = q.bx - q.ax;
    const d2z = q.bz - q.az;
    const rx = p.ax - q.ax;
    const rz = p.az - q.az;
    const a = d1x * d1x + d1z * d1z;
    const e = d2x * d2x + d2z * d2z;
    const f = d2x * rx + d2z * rz;
    let s = 0;
    let u = 0;
    if (a <= 1e-9 && e <= 1e-9)
        return [p.ax, p.az, q.ax, q.az];
    if (a <= 1e-9) {
        u = Math.max(0, Math.min(1, f / e));
    }
    else {
        const c = d1x * rx + d1z * rz;
        if (e <= 1e-9) {
            s = Math.max(0, Math.min(1, -c / a));
        }
        else {
            const b = d1x * d2x + d1z * d2z;
            const den = a * e - b * b;
            s = den > 1e-9 ? Math.max(0, Math.min(1, (b * f - c * e) / den)) : 0;
            u = (b * s + f) / e;
            if (u < 0) {
                u = 0;
                s = Math.max(0, Math.min(1, -c / a));
            }
            else if (u > 1) {
                u = 1;
                s = Math.max(0, Math.min(1, (b - c) / a));
            }
        }
    }
    return [p.ax + d1x * s, p.az + d1z * s, q.ax + d2x * u, q.az + d2z * u];
}
function collide(t, obstacles) {
    const o = t.options;
    const spec = o.vehicle;
    const m = spec.mass;
    const inertia = (m * (o.length * o.length + o.width * o.width)) / 12;
    const bodies = t.cars.map((c) => c.body);
    const caps = bodies.map((b) => capsule(b.position.x, b.position.z, headingOf(b), o.length, o.width));
    const obs = obstacles.map((ob) => ob.length != null
        ? capsule(ob.x, ob.z, ob.yaw ?? 0, ob.length, ob.width ?? o.width)
        : { ax: ob.x, az: ob.z, bx: ob.x, bz: ob.z, r: ob.radius ?? 2 });
    /** `other` is a body (with its centre, mass and inertia), or null for an immovable obstacle. */
    const hit = (i, q, other, ovx, ovz) => {
        const a = bodies[i];
        const [px, pz, qx, qz] = closest(caps[i], q);
        let nx = px - qx;
        let nz = pz - qz;
        const d = Math.hypot(nx, nz);
        const depth = caps[i].r + q.r - d;
        if (depth <= 0)
            return;
        if (d > 1e-6) {
            nx /= d;
            nz /= d;
        }
        else {
            nx = 1;
            nz = 0;
        }
        // Apart, by mass: the lighter moves more; all of it against an immovable obstacle.
        const mb = other ? other.mass : Infinity;
        const share = other ? (depth * mb) / (m + mb) : depth;
        a.position = {
            ...a.position,
            x: a.position.x + nx * share,
            z: a.position.z + nz * share,
        };
        if (other) {
            const back = depth - share;
            const ob = other.body;
            ob.position = {
                ...ob.position,
                x: ob.position.x - nx * back,
                z: ob.position.z - nz * back,
            };
        }
        // The impulse, through the contact point.
        const cx = (px + qx) / 2;
        const cz = (pz + qz) / 2;
        const rax = cx - a.position.x;
        const raz = cz - a.position.z;
        const wa = a.angularVelocity.y;
        let vrx = a.velocity.x + wa * raz;
        let vrz = a.velocity.z - wa * rax;
        let rbx = 0;
        let rbz = 0;
        if (other) {
            rbx = cx - other.x;
            rbz = cz - other.z;
            const ob = other.body;
            const wb = ob.angularVelocity.y;
            vrx -= ob.velocity.x + wb * rbz;
            vrz -= ob.velocity.z - wb * rbx;
        }
        else {
            vrx -= ovx;
            vrz -= ovz;
        }
        const vn = vrx * nx + vrz * nz;
        if (vn >= 0)
            return;
        const ca = raz * nx - rax * nz;
        const cb = rbz * nx - rbx * nz;
        const k = 1 / m +
            (ca * ca) / inertia +
            (other ? 1 / other.mass + (cb * cb) / other.inertia : 0);
        const j = (-(1 + 0.3) * vn) / k;
        a.velocity = {
            ...a.velocity,
            x: a.velocity.x + (j * nx) / m,
            z: a.velocity.z + (j * nz) / m,
        };
        a.angularVelocity = {
            ...a.angularVelocity,
            y: a.angularVelocity.y + (ca * j) / inertia,
        };
        if (other) {
            const ob = other.body;
            ob.velocity = {
                ...ob.velocity,
                x: ob.velocity.x - (j * nx) / other.mass,
                z: ob.velocity.z - (j * nz) / other.mass,
            };
            ob.angularVelocity = {
                ...ob.angularVelocity,
                y: ob.angularVelocity.y - (cb * j) / other.inertia,
            };
        }
    };
    for (let i = 0; i < bodies.length; i++) {
        for (let k = i + 1; k < bodies.length; k++) {
            const dx = caps[i].ax - caps[k].ax;
            const dz = caps[i].az - caps[k].az;
            if (dx * dx + dz * dz > (o.length + o.width) ** 2)
                continue;
            const b = bodies[k];
            hit(i, caps[k], { body: b, x: b.position.x, z: b.position.z, mass: m, inertia }, 0, 0);
        }
        obstacles.forEach((ob, k) => {
            if (ob.body) {
                const mass = ob.mass ?? m;
                const len = ob.length ?? o.length;
                const wid = ob.width ?? o.width;
                hit(i, obs[k], {
                    body: ob.body,
                    x: ob.x,
                    z: ob.z,
                    mass,
                    inertia: (mass * (len * len + wid * wid)) / 12,
                }, 0, 0);
            }
            else
                hit(i, obs[k], null, ob.vx ?? 0, ob.vz ?? 0);
        });
    }
}
/*
THE KERB. A car's middle stays inside the road cells, `kerb` metres in from any
side that borders no road (where the buildings are); between two road cells
there is no kerb. A car pushed past one is put back on it, and loses the speed
it had into it.
*/
function kerb(t, body) {
    const { layout, cell } = t.options;
    const m = t.options.kerb;
    const p = body.position;
    const gx = Math.floor(p.x / cell + layout.width / 2);
    const gz = Math.floor(p.z / cell + layout.depth / 2);
    let best = null;
    let bestD = Infinity;
    for (let dz = -1; dz <= 1; dz++) {
        for (let dx = -1; dx <= 1; dx++) {
            const x = gx + dx;
            const z = gz + dz;
            if (!isRoad(layout, x, z))
                continue;
            const mask = maskAt(layout, x, z);
            const x0 = (x - layout.width / 2) * cell + (mask & 8 ? 0 : m);
            const x1 = (x + 1 - layout.width / 2) * cell - (mask & 2 ? 0 : m);
            const z0 = (z - layout.depth / 2) * cell + (mask & 4 ? 0 : m);
            const z1 = (z + 1 - layout.depth / 2) * cell - (mask & 1 ? 0 : m);
            const cx = Math.max(x0, Math.min(x1, p.x));
            const cz = Math.max(z0, Math.min(z1, p.z));
            const d = Math.hypot(cx - p.x, cz - p.z);
            if (d < bestD) {
                bestD = d;
                best = [cx, cz];
            }
        }
    }
    if (best == null || bestD < 1e-6)
        return;
    const nx = (best[0] - p.x) / bestD;
    const nz = (best[1] - p.z) / bestD;
    body.position = { ...p, x: best[0], z: best[1] };
    // The speed into the kerb is gone (a little bounce).
    const vn = body.velocity.x * nx + body.velocity.z * nz;
    if (vn < 0)
        body.velocity = {
            ...body.velocity,
            x: body.velocity.x - 1.2 * vn * nx,
            z: body.velocity.z - 1.2 * vn * nz,
        };
}
//# sourceMappingURL=city-traffic.js.map