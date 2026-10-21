# surroundings

**One budgeted read of what is around a character, and the affordances derived
from it.** Pure — distances and degrees, no Babylon, no rays — so cover can be
tested against a world you type out by hand.

Two halves, and the split is the point:

- **The READ** is a measurement. A ring of bearings × a ladder of heights, each
  holding the distance to the nearest obstruction. It knows nothing about cover,
  climbing or shooting.
- **The QUERIES** are relations between that measurement, a character and a
  threat. `shelterFrom` is not a property of a wall; it depends on your size,
  your stance and where the shooting is coming from.

`MOBILITY-DESIGN.md` argues both, and the second is the one with teeth:

> **Suffixes declare what geometry IS. Affordances describe what a character can
> DO with it, and must be computed.** A `_cover` suffix would be a bug, not a
> shortcut.

## Demo — walk into cover and watch it happen

**WASD / left stick** to move. The red sphere is the shooter. The marker turns
green when you are in cover, and the readout says how much of you is hidden,
what stance the cover demands, which side you could lean out of, and whether
your own wall is in the way of your shot.

Things worth doing:

- **Stand behind the long low wall.** You are covered — crouched. Now walk to
  its end and watch cover fall away with nothing pressed and nothing stuck.
- **Stand behind the pillar.** Full cover, and `peek` says `both` — a pillar is
  cover you can shoot past on either side.
- **Walk into the corner.** The wall doing the work is not the one facing the
  shooter, which is why `shelterFrom` searches an arc.
- **Compare the low wall with the railing** (the one on legs). Same height, same
  distance, no cover at all — because a shelter with a gap under it is not a
  shelter.

The rays are cast at 10Hz, not every frame, which is the budget the design
asks for: 12 bearings × 7 heights is 84 casts, and at a walk you move 5cm
between reads.

```js
import { b3d, b3dSkybox, b3dController, sceneDelta, label3d, slider3d } from 'tosijs-3d'
import { makeSurroundings, SurroundingsProbe, shelterFrom, exposure, inShelter, stanceFor, peekSide, muzzleClearance, DEFAULT_HEIGHTS } from 'tosijs-3d'
import { demoSun, orbitCam, patternGround } from 'tosijs-3d/demo-utils'
import { tosi } from 'tosijs'

const demo = tosi({ coverDemo: { range: 1.2, needed: 0.8 } })
const s = demo.coverDemo

let hero = null
let babylon = null
let readout = null
let covered = false

const controller = b3dController({
  mapping: 'biped',
  drive(input, dt) {
    if (!hero) return
    // World-axis walking: this demo is about WHERE you stand, not about driving.
    hero.position.x += input.strafe * dt * 4
    hero.position.z += input.forward * dt * 4
  },
})

const panel = () => [
  label3d({ text: 'Cover' }),
  slider3d({ label: 'reach (m)', value: s.range, min: 0.5, max: 3, step: 0.1, showValue: 'always',
    handleChange: (v) => { s.range = v } }),
  slider3d({ label: 'needed', value: s.needed, min: 0.4, max: 1, step: 0.05, showValue: 'always',
    handleChange: (v) => { s.needed = v } }),
]

const scene = b3d(
  {
    style: 'width:100%;height:100%',
    gamepad: 'left_stick',
    scenePanel: panel,
    sceneCreated(el, BABYLON) {
      babylon = BABYLON
      orbitCam(el, { radius: 26, betaDeg: 35.5, target: [0, 1, 2] })

      const solid = (name, w, h, d, x, y, z) => {
        const m = BABYLON.MeshBuilder.CreateBox(name, { width: w, height: h, depth: d }, el.scene)
        m.position.set(x, y, z)
        const mat = new BABYLON.StandardMaterial(name + '-mat', el.scene)
        mat.diffuseColor = new BABYLON.Color3(0.55, 0.52, 0.48)
        m.material = mat
        el.register?.({ meshes: [m] })
        return m
      }

      // A low wall, a pillar, an L-shaped corner, and a railing that is not cover.
      solid('lowwall', 9, 1.1, 0.4, -3, 0.55, 5)
      solid('pillar', 1.2, 2.4, 1.2, 5, 1.2, 4)
      solid('corner-a', 0.4, 2.2, 5, 10, 1.1, 2)
      solid('corner-b', 4, 2.2, 0.4, 8.2, 1.1, 4.6)
      // A railing: top rail only, wide open underneath.
      solid('rail', 6, 0.25, 0.3, -9, 1.05, 5)
      solid('rail-post-a', 0.2, 1.1, 0.2, -11.8, 0.55, 5)
      solid('rail-post-b', 0.2, 1.1, 0.2, -6.2, 0.55, 5)

      const threat = BABYLON.MeshBuilder.CreateSphere('threat', { diameter: 0.9 }, el.scene)
      threat.position.set(0, 1.5, 18)
      const tm = new BABYLON.StandardMaterial('threat-mat', el.scene)
      tm.diffuseColor = new BABYLON.Color3(0.9, 0.15, 0.2)
      tm.emissiveColor = new BABYLON.Color3(0.5, 0.05, 0.08)
      threat.material = tm

      hero = BABYLON.MeshBuilder.CreateCapsule('hero', { height: 1.8, radius: 0.35 }, el.scene)
      hero.position.set(0, 0.9, -2)
      const hm = new BABYLON.StandardMaterial('hero-mat', el.scene)
      hero.material = hm
      el.register?.({ meshes: [hero] })

      // ONE probe, throttled to 10Hz, reusing its buffers. `SurroundingsProbe`
      // gathers the nearby meshes once per read instead of asking the whole
      // scene 84 times — see "The probe and what it costs", below.
      const surr = makeSurroundings({ bearingCount: 12, heights: DEFAULT_HEIGHTS })
      const probe = new SurroundingsProbe(surr, 10)
      const solidOnly = (m) => m !== hero && m !== threat && m.name !== 'ground' && m.isVisible
      const foot = new BABYLON.Vector3(0, 0, 0)

      el.scene.onBeforeRenderObservable.add(() => {
        const dt = sceneDelta(el.scene)
        const range = Number(s.range)
        // THE FEET, and the feet do not move when he crouches. Deriving them
        // from `position` (a capsule CENTRE, which drops on a crouch) shifts
        // the whole height ladder down with it, so the wall measures taller
        // than it is and the character talks himself out of the cover he is
        // standing behind — while crouching, which lowers it again.
        foot.set(hero.position.x, 0, hero.position.z)
        // `false` means "nothing new to look at" — so the derivation is skipped
        // too, rather than recomputing identical answers sixty times a second.
        if (!probe.update(el.scene, foot, dt, { maxRange: range, filter: solidOnly })) return

        const threatDeg = (Math.atan2(threat.position.x - hero.position.x,
                                      threat.position.z - hero.position.z) * 180) / Math.PI
        const stature = { standing: 1.8, needed: Number(s.needed) }
        const sh = shelterFrom(surr, threatDeg, { maxRange: range })
        // Stance FIRST: how exposed you are depends on what you are doing
        // about it, and a low wall you are crouched behind hides all of you.
        const stance = stanceFor(sh.height, stature)
        const masked = 1 - exposure(sh.height, stature, stance ?? 'standing')
        covered = inShelter(masked, covered)
        const peek = peekSide(surr, threatDeg, { maxRange: range })
        const clear = muzzleClearance(surr, threatDeg, stance === 'crouched' ? 0.9 : 1.45, { maxRange: range })

        hm.diffuseColor = covered
          ? new BABYLON.Color3(0.25, 0.75, 0.35)
          : new BABYLON.Color3(0.9, 0.6, 0.2)
        // Crouch when the cover demands it — derived, like everything else here.
        hero.scaling.y = stance === 'crouched' ? 0.62 : 1
        // Keep the FEET on the floor whatever the stance does.
        hero.position.y = 0.9 * hero.scaling.y

        if (readout) {
          readout.textContent =
            `hidden ${(masked * 100).toFixed(0)}%   cover ${sh.height.toFixed(1)}m   ` +
            `${covered ? 'IN COVER' : 'exposed'}   stance ${stance ?? 'none'}   ` +
            `peek ${peek ?? 'none'}   ${clear > 0 ? `shot BLOCKED (needs ${clear.toFixed(1)}m)` : 'shot clear'}`
        }
      })
    },
  },
  demoSun(),
  b3dSkybox({ timeOfDay: 11 }),
  patternGround({ size: 60 }),
  controller
)

preview.append(scene)
readout = document.createElement('div')
readout.style.cssText = 'position:absolute;bottom:8px;left:8px;right:8px;font:12px monospace;background:#0009;color:#fff;padding:4px 8px;border-radius:4px'
preview.append(readout)
```
```css
.preview { height: 100%; position: relative; }
```

> **WASD** to move. The marker turns green when the probe says you are in cover
> — walk behind a block and watch it flip, then widen `reach` and watch cover
> start further out.
>
> Cover is DISCOVERED here, not entered: nothing puts you into a cover mode and
> there is no state to leave. The readout is the live answer, which is why it
> can disagree with where you thought you were standing.

## Why a shared read rather than a fan of rays per feature

Also from `MOBILITY-DESIGN.md`:

> when the second consumer appears, **do not give it its own fan of rays.** One
> budgeted environmental read per tick, shared — "what is around me, at what
> heights, how far" — with features asking questions of the result.

Cover is that second consumer. A mantle check is eight casts; cover wants a ring;
"can I get there" wants another; at eight per frame per feature a character
controller eats the frame budget on its own. And a shared read has a second
virtue that matters more than the cost: every feature is then reasoning about
the SAME world. Two private reads disagree at exactly the moment they matter —
the frame you are half behind a wall.

The read is deliberately coarse. Twelve bearings is 30° apart, which sounds
crude until you remember what it is for: a wall you are pressed against occupies
many buckets, and a gap you could be shot through occupies at least one. It is
sampling a room, not tracing a silhouette.

## Heights, not a height

One forward ray at shin height misses a canal bank whose face exists only between
0.25m and 1.25m (undercut below, sloping away above), and the character is then
visibly stuck against a wall the probe says is not there. **Real geometry is not
sampled correctly by a single ray, and the failure is silent**, because a miss
and an absence are the same reading.

So the unit of measurement here is a COLUMN: what is in front of me, at every
height that matters. A low wall and a doorway are the same distance and
completely different affordances, and the only thing that tells them apart is
which heights are blocked.

## Cover is derived, never entered

`shelterFrom` returns how much of you is masked, right now. There is no
`enterCover`, no cover state and nothing to be stuck in — the anti-goal the whole
design is organised around. `inShelter` adds the one bit of state anybody needs,
and it is hysteresis rather than a mode, so the answer does not flicker at its
threshold (the same reason swimming has a band).

## The probe and what it costs

`SurroundingsProbe` is the Babylon half: it casts the rays that fill the read.
`new SurroundingsProbe(surroundings, hz)` and then, each frame,
`probe.update(scene, feet, dt, { maxRange, filter })`, which returns `false` when
no new read was due. It is separate so the pure module stays importable without a
renderer.

One read is **12 bearings × 7 heights = 84 rays**. The probe gathers the nearby
meshes ONCE per read (a bounding-sphere distance test) instead of letting every
ray test every mesh in the scene, so the cost depends on what is **near the
character**, not on how big the level is. Measured in Chrome:

| per read | 11 meshes | 311 | 1011 |
| --- | --- | --- | --- |
| `scene.pickWithRay` | 105µs | **2809µs** | — |
| `SurroundingsProbe` | **50µs** | 39µs | **73µs** |

The extra meshes were hundreds of metres away and none was within reach. The
results agree with `pickWithRay` to within 2mm.

The queries on top (`shelterFrom`, `stanceFor`, `exposure`, `inShelter`,
`peekSide`, `muzzleClearance`) together take about **160ns**, roughly 450× less
than the read. The rays are the cost; the thinking is not. At 10Hz, cover
discovery is about **0.7ms of CPU per character per second**, so a tenth of a 60fps
frame covers roughly **140 characters**.
