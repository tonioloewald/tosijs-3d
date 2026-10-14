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
  sol: { maps: false, focus: 'Earth', animate: true, showOrbits: true, belt: 1500 },
})

const system = b3dStarSystem({ scale: 5, orbitScale: 3, animate: 'on', showOrbits: 'on', maps: 'off', beltCount: sol.belt.value })
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
      scenePanel: () => [
        label3d({ text: 'Solar System' }),
        select3d({ label: 'look at', value: sol.focus, options: names }),
        toggle3d({ label: 'real maps (Earth, Moon, Mars)', value: sol.maps }),
        toggle3d({ label: 'orbit', value: sol.animate }),
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
    // The star sky, without a sun: the Sun is the system's own star.
    ...spaceBackdrop({ sky: '/sky', sun: false }),
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
  screen apart (see [system-layout](/system-layout/)). A year takes about a
  minute.
- **Exaggerated:** the asteroid belt. The real one is so sparse that from
  inside it you would see nothing.
- **Made up:** every surface without a map. The looks are right in kind
  (Io's sulfur, Titan's haze, Saturn's rings), not in detail.

The system itself is the data in [sol](/sol/); give a star system your own
`SystemSpec` to draw another.
