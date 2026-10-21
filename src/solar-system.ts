/*#
# Solar System

Our own solar system, built from the parts the rest of this site documents:
every planet and moon a [planet](/b3d-planet/), the giants banded and
ringed ([gas-giant](/gas-giant/)), the rocky worlds and moons drawn by
[rocky-world](/rocky-world/)'s looks (the Moon, Mercury, Mars, Venus, Io,
Titan, ice moons), Phobos, Deimos, Vesta and Pallas as lumpy rocks, and an
asteroid belt between Mars and Jupiter.

Pick a body under **look at** and the camera follows it round its orbit.
Switch on **real maps** and the Earth, the Moon and Mars are drawn from NASA's
and NOAA's own height and colour maps instead of being made up.

## Demo

```js
import { b3d, b3dLight, b3dStarSystem, spaceBackdrop, SOL, label3d, slider3d, toggle3d, select3d } from 'tosijs-3d'
import { tosi } from 'tosijs'

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

// Every body, inmost first: the star, each planet then its moons, the belt.
const names = [
  SOL.star.name,
  ...SOL.planets.flatMap((p) => [p.name, ...(p.moons ?? []).map((m) => m.name)]),
  ...(SOL.belt ?? []).map((b) => b.name),
]

preview.append(
  b3d(
    {
      clearColor: '#000000',
      scenePanelOpen: true,
      panelTitle: 'Solar System',
      scenePanel: () => [
        select3d({ label: 'look at', value: sol.focus, options: names }),
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
        camera.upperRadiusLimit = 900
        camera.minZ = 0.05
        camera.maxZ = 6000
        camera.wheelDeltaPercentage = 0.02
        camera.attachControl(el.querySelector('canvas'), true)
        el.setActiveCamera(camera)
        // FOLLOW THE CHOSEN BODY: ease onto it every frame, and on choosing,
        // pull in to a few of its radii.
        let following = ''
        let around = 0
        el.scene.onBeforeRenderObservable.add(() => {
          const body = system.bodies.find((b) => b.name === sol.focus.value)
          if (body == null) return
          const at = body.node.getAbsolutePosition()
          // In place: ASSIGNING an orbit camera's target keeps the camera
          // where it is and changes its distance instead.
          BABYLON.Vector3.LerpToRef(camera.target, at, 0.15, camera.target)
          // Where round the Sun the body is. The camera turns with it, so
          // the light on the body stays where it was (and dragging still
          // orbits it): a fixed camera slid onto the night side as it went.
          const now = Math.atan2(-at.z, -at.x)
          if (sol.focus.value !== following) {
            following = sol.focus.value
            camera.radius = Math.max(2, body.radius * 7)
            // Come in from the sunlit side (the Sun is at the centre).
            if (at.length() > 0.01) camera.alpha = now + 0.5
          } else if (at.length() > 0.01) {
            let turn = now - around
            if (turn > Math.PI) turn -= Math.PI * 2
            if (turn < -Math.PI) turn += Math.PI * 2
            camera.alpha += turn
          }
          around = now
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
    system
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
