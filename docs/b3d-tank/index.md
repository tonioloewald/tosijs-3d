# b3d-tank

**A tracked vehicle**: a tank, a bulldozer, a tracked loader. Each track runs
at its own speed, so it steers by running one faster than the other and turns
on the spot with the stick to one side. It climbs what a car would slide back
down, and stops dead when you let go. The handling is
[ground-vehicle](/ground-vehicle/); the [b3d-car](/b3d-car/) page has one to
drive beside the cars.

## Demo

```js
import { b3d, b3dTank, inputFocus, playground } from 'tosijs-3d'

const tank = b3dTank({ x: -4, z: 10, player: true })
preview.append(
  b3d(
    { style: 'width: 100%; height: 100%', gamepad: 'left_stick,right_stick,left_trigger,right_trigger,right_bumper' },
    ...playground({ targets: 0 }),
    inputFocus(tank)
  )
)
```
```css
.preview { height: 100%; }
```

**W** and **S** (on a gamepad the right trigger, and the left trigger or right bumper) drive forward and
back, **A** and **D** (the left stick) steer; with nothing else held they pivot
it where it stands. The **arrow keys** (the right stick) aim the turret: left
and right traverse it, and pulling back raises the gun (pushing forward lowers
it). Clicking the right stick swaps up and down to the camera, which then
moves along its arc as a car's does (in a headset, in and out), and back. The camera follows the turret, leading it a little while it turns, and
the turret holds its aim while the hull turns under it.

## Its body

Given no `url` or `library`, it builds a plain one: a hull, a turret, and two
tracks whose treads move with the belts. A model of your own needs its tracks
as meshes with **`track`** in their names, one each side; the tank stands them
on five points along their undersides, and its raised ends climb: it gets up
a step about as high as its tracks. A node named **`turret`** turns on the
hull, and one inside it named **`mantlet`** (or else **`gun`**, **`barrel`**
or **`cannon`**) elevates (from -8° to 20°); put each one's origin on its
pivot. Meshes named **`wheel`** turn with their side's track.

Tracks can be LINKS instead (meshes named **`track_link…`**), carried round
by the model's own animation, one cycle moving each link onto the next one's
place: the tank plays it by the distance the track has run over the ground, so
the links grip at the pace of the ground, either way and turning on the spot.
Its other track meshes (a solid belt drawn over the links) are then hidden;
`guard`s stay. [Cross Country](/cross-country/) drives Tonio's tank, built
this way.

## Attributes

Those of [b3d-car](/b3d-car/) (`url`, `library`, `meshName`, `scale`,
`enterable`, `mass`, `maxSpeed`, `acceleration`, `braking`, `grip`,
`headlights`, `sound`), with a
tank's defaults: 20 t, 12 m/s, 3 m/s². And:

| Attribute | Default | Description |
|-----------|---------|-------------|
| `turnSpeed` | `1.2` | How far apart the belts run at full steer, m/s |
