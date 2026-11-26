/*#
# Solar System

Our own solar system, built from the parts the rest of this site documents:
every planet and moon a [planet](/b3d-planet/), the giants banded and
ringed ([gas-giant](/gas-giant/)), the rocky worlds and moons drawn by
[rocky-world](/rocky-world/)'s looks (the Moon, Mercury, Mars, Venus, Io,
Titan, ice moons), Phobos, Deimos, Vesta and Pallas as lumpy rocks, and an
asteroid belt between Mars and Jupiter.

Pick a body from the **view** menu (the camera on the bar) or click it, and
the camera flies to it and follows it round its orbit; click the background
to fly back out to the whole system. Switch on **real maps** in the scene's
settings and the Earth, the Moon and Mars are drawn from NASA's and NOAA's
own height and colour maps instead of being made up.

In a headset with passthrough (a Quest), the VR button on the bar offers
**VR** or **Passthrough**. In passthrough the system sits three metres
across in your own room, the Sun a step ahead. Walk round it; hold a grip to
drag it, both grips to make it bigger or smaller and turn it. Point at a
body and pull the trigger to bring it in front of you; trigger on empty
space to go back to the whole system.

## Demo

```js
import { b3d, b3dLight, b3dStarSystem, spaceBackdrop, SOL, slider3d, toggle3d, barMenu, sceneDelta, pointerClaimedByPanel } from 'tosijs-3d'
import { tosi } from 'tosijs'

const WHOLE = 'Solar System'
const { sol } = tosi({
  sol: { maps: false, focus: 'Earth', animate: true, showOrbits: true, belt: 1500, time: 3600 },
})

const system = b3dStarSystem({ scale: 5, orbitScale: 3, animate: 'on', showOrbits: 'on', maps: 'off', beltCount: sol.belt.value, timeScale: sol.time })
// Our own system, as data, instead of a star from the galaxy.
system.system = SOL

sol.maps.observe(() => {
  system.maps = sol.maps.value ? 'on' : 'off'
  system.regenerate()
})
sol.belt.observe(() => {
  system.beltCount = sol.belt.value
  system.regenerate()
})
sol.animate.observe(() => (system.animate = sol.animate.value ? 'on' : 'off'))
sol.showOrbits.observe(() => {
  system.showOrbits = sol.showOrbits.value ? 'on' : 'off'
  system.updateOptions()
})

// Simulated time per real second, in the unit that reads best.
const perSecond = (v) =>
  v < 60 ? `${v.toPrecision(2)} s/s`
  : v < 3600 ? `${(v / 60).toPrecision(2)} min/s`
  : v < 86400 ? `${(v / 3600).toPrecision(2)} h/s`
  : `${(v / 86400).toPrecision(3)} days/s`

// THE VIEW MENU on the system bar: the whole system, the Sun, each planet
// (one with moons opens a list of it and them), the belt's big rocks.
const view = barMenu({
  icon: 'camera',
  title: 'View',
  layout: 'list',
  value: sol.focus.value,
  options: [
    WHOLE,
    SOL.star.name,
    ...SOL.planets.map((p) =>
      p.moons?.length ? { label: p.name, items: [p.name, ...p.moons.map((m) => m.name)] } : p.name
    ),
    ...(SOL.belt?.length ? [{ label: 'Belt', items: SOL.belt.map((b) => b.name) }] : []),
  ],
  handleChange: (v) => (sol.focus.value = v),
})
sol.focus.observe(() => (view.value = sol.focus.value))

preview.append(
  b3d(
    {
      clearColor: '#000000',
      panelTitle: 'Solar System',
      // Where the device has both, the VR button offers VR or Passthrough.
      xrPassthrough: 'offer',
      scenePanel: () => [
        toggle3d({ label: 'real maps (Earth, Moon, Mars)', value: sol.maps }),
        toggle3d({ label: 'orbit', value: sol.animate }),
        // Real time up to a year every ten seconds.
        slider3d({ label: 'time', value: sol.time, min: 1, max: 3.16e6, scale: 'log', format: perSecond }),
        toggle3d({ label: 'show orbits', value: sol.showOrbits }),
        slider3d({ label: 'belt rocks', value: sol.belt, min: 0, max: 6000, step: 250 }),
      ],
      sceneCreated(el, BABYLON) {
        const camera = new BABYLON.ArcRotateCamera('sol', -Math.PI / 2, Math.PI / 2.6, 40, BABYLON.Vector3.Zero(), el.scene)
        camera.lowerRadiusLimit = 1
        camera.upperRadiusLimit = 1600
        camera.minZ = 0.05
        camera.maxZ = 8000
        camera.wheelDeltaPercentage = 0.02
        camera.attachControl(el.querySelector('canvas'), true)
        el.setActiveCamera(camera)
        const centre = () => new BABYLON.Vector3(system.x, system.y, system.z)
        const bodyNamed = (name) => system.bodies.find((b) => b.name === name)
        // How far the outermost body is from the Sun: the whole system's size.
        const extent = () =>
          Math.max(1, ...system.bodies.map((b) => BABYLON.Vector3.Distance(b.node.getAbsolutePosition(), centre())))

        // IN A HEADSET, a view moves YOU (el.xrFrame scales and places the
        // viewer): the whole system three metres across, or a body a few of
        // its radii across, gliding there. Passthrough starts on the whole.
        const frameView = (ms) => {
          if (!el.xrActive) return
          const body = bodyNamed(sol.focus.value)
          if (body == null) el.xrFrame(centre(), extent(), { across: 1.5, ms })
          else el.xrFrame(body.node.getAbsolutePosition(), Math.max(body.radius * 3, 0.5), { ms })
        }
        el.addEventListener('xrenter', (event) => {
          if (!event.detail.passthrough) return
          sol.focus.value = WHOLE
          frameView(0)
        })
        sol.focus.observe(() => frameView(1200))

        // CLICK (or point and pull the trigger): a body flies to it, the
        // background back out to the whole system. A small body is hard to
        // hit, so the nearest within a couple of degrees of the ray counts.
        const bodyOnRay = (ray) => {
          let best = null
          let bestScore = 1
          for (const b of system.bodies) {
            const to = b.node.getAbsolutePosition().subtract(ray.origin)
            const dist = to.length()
            const along = BABYLON.Vector3.Dot(to, ray.direction) / dist
            if (!(along > 0)) continue
            const angle = Math.acos(Math.min(1, along))
            const reach = Math.max(Math.asin(Math.min(1, (b.radius * 1.3) / dist)), 0.035)
            if (angle / reach < bestScore) {
              bestScore = angle / reach
              best = b
            }
          }
          return best
        }
        // A TAP is a press let go with the ray where it was (a drag turns
        // the view instead). Babylon's own tap is unreliable for a
        // headset's ray, so it is measured here, the same for both.
        const rayOf = (info) =>
          info.pickInfo?.ray ??
          el.scene.createPickingRay(el.scene.pointerX, el.scene.pointerY, BABYLON.Matrix.Identity(), el.scene.activeCamera)
        let down = null
        el.scene.onPointerObservable.add((info) => {
          const { POINTERDOWN, POINTERUP } = BABYLON.PointerEventTypes
          if (info.type === POINTERDOWN) {
            const ray = rayOf(info)
            down = { event: info.event, dir: ray.direction.clone(), ray }
          } else if (info.type === POINTERUP && down != null) {
            const press = down
            down = null
            // A press on a panel or the bar is theirs.
            if (pointerClaimedByPanel(press.event)) return
            const turned = Math.acos(Math.min(1, BABYLON.Vector3.Dot(press.dir, rayOf(info).direction)))
            if (turned > 0.026) return
            sol.focus.value = bodyOnRay(press.ray)?.name ?? WHOLE
          }
        })

        // FLAT, THE CAMERA GLIDES: onto the chosen body (or the system's
        // middle), out or in to a few of its radii (or the whole system),
        // round to its sunlit side, then follows it round its orbit. Only
        // while arriving: after that the wheel and a drag are yours.
        const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a))
        let following = ''
        let around = 0
        let distance = 0
        let aim = null
        el.scene.onBeforeRenderObservable.add(() => {
          const ease = 1 - Math.exp(-sceneDelta(el.scene) * 3)
          const body = bodyNamed(sol.focus.value)
          const at = body ? body.node.getAbsolutePosition() : centre()
          // In place: ASSIGNING an orbit camera's target keeps the camera
          // where it is and changes its distance instead.
          BABYLON.Vector3.LerpToRef(camera.target, at, Math.max(ease, 0.04), camera.target)
          // Where round the Sun the body is.
          const round = body != null && at.length() > 0.01 ? Math.atan2(-at.z, -at.x) : null
          if (sol.focus.value !== following) {
            following = sol.focus.value
            distance = body ? Math.max(2, body.radius * 7) : Math.min(camera.upperRadiusLimit, extent() * 1.4)
            // Come in from the sunlit side (the Sun is at the centre).
            aim = round == null ? null : round + 0.5
            around = round ?? 0
          }
          // Out and in geometrically, so a moon to the whole system is even.
          if (distance > 0) {
            camera.radius *= Math.pow(distance / camera.radius, ease)
            if (Math.abs(Math.log(camera.radius / distance)) < 0.01) distance = 0
          }
          if (round == null) return
          // The camera turns with the body round the Sun, so the light on it
          // stays where it was: a fixed camera slid onto the night side.
          const turn = wrap(round - around)
          around = round
          camera.alpha += turn
          if (aim != null) {
            aim += turn
            const d = wrap(aim - camera.alpha)
            camera.alpha += d * ease
            if (Math.abs(d) < 0.01) aim = null
          }
        })
      },
    },
    // A little fill, so a night side is not a hole in the stars.
    b3dLight({ intensity: 0.12 }),
    // The star sky, without a sun: the Sun is the system's own star. TILTED
    // AS IT REALLY IS: the planets orbit about 60.2 degrees to the galaxy's
    // plane. The sky's galaxy is baked level with its centre along -X, so a
    // turn about X tips the band and leaves the centre on the line where the
    // two planes cross (the real one is 5.5 degrees south of the ecliptic).
    ...spaceBackdrop({ sky: '/sky', sun: false, tilt: '60.2,0,0' }),
    system,
    view
  )
)
```
```css
.preview { height: 100%; }
```

## What is true and what is not

- **True:** the order of the planets and moons, their relative sizes (squeezed
  by a square root so the small ones are still visible), which moons go with
  which planet, and with real maps on, the ground of the Earth, the Moon and
  Mars.
- **Squeezed:** distances, on a log scale, or the planets would be specks a
  screen apart (see [b3d-star-system](/b3d-star-system/)).
- **True:** every period. Each planet's day and year and each moon's month
  are the real ones (Venus and Uranus turn backwards, Triton goes round
  backwards); the **time** slider says how fast they run, from real time to a
  year every ten seconds. Fast, a day is too quick to see; slow, a year
  barely moves.
- **Exaggerated:** the asteroid belt. The real one is so sparse that from
  inside it you would see nothing.
- **Made up:** every surface without a map. The looks are right in kind
  (Io's sulfur, Titan's haze, Saturn's rings), not in detail.

The system itself is the data in `SOL` (see [b3d-star-system](/b3d-star-system/)); give a star system your own
`SystemSpec` to draw another.
*/
/*{ "parent": "demos", "order": 20 }*/

export {}
