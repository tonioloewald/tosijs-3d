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
