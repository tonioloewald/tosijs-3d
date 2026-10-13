# b3d-galaxy

Procedural galaxy renderer — the [voxel galaxy](/voxel-galaxy/), the one galaxy
implementation, drawn: thousands of stars in a spiral arm distribution, each
coloured by spectral class. All generation is seeded — same seed, same galaxy.
`el.galaxy` is the galaxy itself; every star carries its address in `id`, and
`getStar(id)` finds it again (an index only means a position in what is loaded).

Stars and nebulae are billboarded **in the vertex shader**: each is a static
quad whose corners the shader turns to face the viewpoint, so a galaxy costs
nothing per frame on the CPU however many stars it holds.

Stars use a custom shader: white-hot center fading to spectral color at edges.
A procedural black hole with accretion disk sits at the galaxy center.

Stars are pickable with `pickStar(x, y)` — click one to zoom in and see its star system rendered
in detail. Use `getStarAt(index)` to retrieve star data and
`getStarSystem(index)` to get full planet detail for any star.
Use `hideStarAt(index)` to hide a star (e.g. when replacing it with a
rendered star system) and `showStarAt(index)` to restore it.

Filter stars by habitability index and/or name using `filterStars({ maxHI, nameSearch })` —
non-matching stars are dimmed.
The galaxy holds every BRIGHT star and every INTERESTING one: a dim star whose
system has a planet with HI ≤ 2 (see [star-populations](/star-populations/)).
So the filter sees every habitable system there is, with its HI already known.
The boring dim stars (the other ~95%) are only generated locally, as sky
texture.

## Demo

```js
import { b3d, b3dLight, b3dGalaxy, b3dStarSystem, label3d, slider3d, select3d } from 'tosijs-3d'
import { tosi, elements } from 'tosijs'
const { div, label, input, p, button, span } = elements

const { demo } = tosi({
  demo: {
    seed: 1234,
    starCount: 5000,
    radius: 100,
    spiralArms: 4,
    particleSize: 2.5,
    coreSize: 0.12,
    habitability: 5,
    nameSearch: '',
    selectedStar: '',
  },
})

const galaxy = b3dGalaxy({
  seed: demo.seed,
  starCount: demo.starCount,
  radius: demo.radius,
  spiralArms: demo.spiralArms,
  particleSize: demo.particleSize,
  coreSize: demo.coreSize,
})

// Star system state
let activeStarSystem = null
let activeStarIndex = -1
let sceneEl = null
// Transition: 'galaxy' | 'zooming-in' | 'star-system' | 'zooming-out'
let viewState = 'galaxy'
let transition = { t: 0, savedAlpha: 0, savedBeta: 0, savedRadius: 0, savedTarget: null }

function lerp(a, b, t) { return a + (b - a) * t }
function smoothstep(t) { return t * t * (3 - 2 * t) }

const scene = b3d(
  {
    frameRate: 60,
    // Generation settings live in the dual-presence ⚙ panel (works in VR); the
    // free-text star search + selection readout stay a flat overlay (typing needs
    // a keyboard). All widgets bind the same demo.* leaves the observers watch.
    scenePanel: () => [
      label3d({ text: 'Galaxy' }),
      select3d({ label: 'habitability', value: demo.habitability, options: [
        { label: 'All', value: 5 },
        { label: 'Robot+', value: 4 },
        { label: 'EVA+', value: 3 },
        { label: 'Survivable+', value: 2 },
        { label: 'Earthlike', value: 1 },
      ] }),
      // 50k, because the interesting use of this demo is now to stand INSIDE a
      // galaxy and photograph the sky from it — and a naked-eye sky wants tens
      // of thousands of stars, not five.
      slider3d({ label: 'stars', value: demo.starCount, min: 1000, max: 50000, step: 1000 }),
      slider3d({ label: 'radius', value: demo.radius, min: 50, max: 300, step: 10 }),
      slider3d({ label: 'spiral arms', value: demo.spiralArms, min: 1, max: 8, step: 1 }),
      // Down to 0.1: the old floor was 0.5, so the size you actually want for a
      // dense field was unreachable. Tonio: "I was testing 0.6 but couldn't
      // dial up 0.4."
      slider3d({ label: 'particle size', value: demo.particleSize, min: 0.1, max: 3, step: 0.1 }),
      // The core is scenery at galaxy scale and an obstruction from inside one.
      slider3d({ label: 'core size', value: demo.coreSize, min: 0, max: 4, step: 0.1 }),
      slider3d({ label: 'seed', value: demo.seed, min: 0, max: 65535, step: 1 }),
    ],
    sceneCreated(el, BABYLON) {
      sceneEl = el
      el.scene.clearColor = new BABYLON.Color4(0.012, 0.008, 0.024, 1)
      const camera = new BABYLON.ArcRotateCamera(
        'orbit-cam',
        -Math.PI / 2,
        Math.PI / 4,
        200,
        BABYLON.Vector3.Zero(),
        el.scene
      )
      camera.lowerRadiusLimit = 2
      camera.upperRadiusLimit = 500
      camera.minZ = 0.1
      camera.maxZ = 2000
      camera.attachControl(el.querySelector('canvas'), true)
      el.setActiveCamera(camera)

      // Transition animation
      el.scene.registerBeforeRender(() => {
        if (viewState === 'zooming-in') {
          transition.t = Math.min(1, transition.t + 0.02)
          const t = smoothstep(transition.t)
          // Fade galaxy out
          galaxy.setVisibility(1 - t)
          // Fade star system in
          if (activeStarSystem) activeStarSystem.setVisibility(t)
          // Zoom camera toward star, then reset to origin for star system view
          const starPos = transition.savedTarget
          camera.target.x = lerp(starPos.x, 0, t)
          camera.target.y = lerp(starPos.y, 0, t)
          camera.target.z = lerp(starPos.z, 0, t)
          camera.radius = lerp(transition.savedRadius, 100, t)
          if (transition.t >= 1) {
            viewState = 'star-system'
            galaxy.setVisibility(0)
            camera.target.set(0, 0, 0)
            camera.radius = 100
          }
        } else if (viewState === 'zooming-out') {
          transition.t = Math.min(1, transition.t + 0.02)
          const t = smoothstep(transition.t)
          // Fade star system out
          if (activeStarSystem) activeStarSystem.setVisibility(1 - t)
          // Fade galaxy in
          galaxy.setVisibility(t)
          camera.radius = lerp(100, transition.savedRadius, t)
          camera.target.x = lerp(0, transition.savedTarget.x, t)
          camera.target.y = lerp(0, transition.savedTarget.y, t)
          camera.target.z = lerp(0, transition.savedTarget.z, t)
          if (transition.t >= 1) {
            viewState = 'galaxy'
            if (activeStarSystem) {
              activeStarSystem.remove()
              activeStarSystem = null
            }
            galaxy.showStarAt(activeStarIndex)
            galaxy.setVisibility(1)
            activeStarIndex = -1
            demo.selectedStar.value = ''
            camera.alpha = transition.savedAlpha
            camera.beta = transition.savedBeta
            camera.radius = transition.savedRadius
            camera.target.set(transition.savedTarget.x, transition.savedTarget.y, transition.savedTarget.z)
          }
        }
      })

      // Star picking — click = mousedown + mouseup within 5px
      let downX = 0, downY = 0
      el.scene.onPointerDown = (evt) => {
        if (evt.button !== 0) return
        downX = evt.offsetX
        downY = evt.offsetY
      }
      el.scene.onPointerUp = (evt) => {
        if (evt.button !== 0 || viewState !== 'galaxy') return
        const dx = evt.offsetX - downX
        const dy = evt.offsetY - downY
        if (dx * dx + dy * dy > 25) return // dragged — not a click

        const idx = galaxy.pickStar(evt.offsetX, evt.offsetY)
        if (idx >= 0) zoomToStar(idx, camera, el)
      }
    },
  },
  b3dLight({ intensity: 0.1 }),
  galaxy,
)

function zoomToStar(idx, camera, el) {
  if (activeStarSystem) {
    activeStarSystem.remove()
    galaxy.showStarAt(activeStarIndex)
  }

  activeStarIndex = idx
  const star = galaxy.getStarAt(idx)
  const pos = galaxy.getStarPosition(idx)
  if (!star || !pos) return

  const system = galaxy.getStarSystem(idx)
  const hi = system && system.planets.length > 0
    ? Math.min(...system.planets.map((p) => p.HI))
    : star.bestHI
  demo.selectedStar.value = star.name + ' (' + star.spectralType + ', HI ' + hi + ')'
  galaxy.hideStarAt(idx)

  // Save camera state for return trip
  transition = {
    t: 0,
    savedAlpha: camera.alpha,
    savedBeta: camera.beta,
    savedRadius: camera.radius,
    savedTarget: { x: camera.target.x, y: camera.target.y, z: camera.target.z },
  }

  // Create star system at origin, full scale, initially invisible
  // By ADDRESS — the star itself, not its position in a list.
  activeStarSystem = b3dStarSystem({
    galaxySeed: demo.seed.value,
    starCount: demo.starCount.value,
    star: star.id,
    scale: 5,
    orbitScale: 3,
    animate: 'on',
    showOrbits: 'on',
  })
  el.appendChild(activeStarSystem)
  activeStarSystem.setVisibility(0)

  viewState = 'zooming-in'
}

function returnToGalaxy() {
  if (viewState !== 'star-system') return
  transition.t = 0
  viewState = 'zooming-out'
}

// Escape key returns to galaxy view
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && activeStarIndex >= 0) returnToGalaxy()
})

const backBtn = button(
  {
    style: 'display:none; margin-top:4px; cursor:pointer; background:#444; color:white; border:1px solid #888; border-radius:3px; padding:2px 8px; font:12px monospace',
    onclick() { returnToGalaxy() },
  },
  'Back to galaxy'
)
const starLabel = span({ style: 'color:#8cf' })
demo.selectedStar.observe((v) => {
  starLabel.textContent = v
  backBtn.style.display = v ? 'block' : 'none'
})

// Flat overlay keeps only the star search + selection readout; the generation
// settings all live in the ⚙ scene panel (and in VR).
preview.append(
  scene,
  div(
    { class: 'debug-panel' },
    p('Click a star to zoom in. Esc to return. Generation settings in the scene panel (VR too).'),
    starLabel,
    backBtn,
    label(
      'search ',
      input({ type: 'text', placeholder: 'star name', style: 'width:8em; color:white; background:transparent; border:1px solid #666; padding:1px 4px; font:12px monospace', bindValue: demo.nameSearch }),
    ),
  )
)

for (const key of ['seed', 'starCount', 'radius', 'spiralArms', 'particleSize', 'coreSize']) {
  demo[key].observe(() => {
    if (activeStarSystem) {
      activeStarSystem.remove()
      activeStarSystem = null
      activeStarIndex = -1
      demo.selectedStar.value = ''
      viewState = 'galaxy'
    }
    galaxy.setVisibility(1)
    galaxy.regenerate()
  })
}

function applyFilter() {
  galaxy.filterStars({
    maxHI: Number(demo.habitability.value),
    nameSearch: demo.nameSearch.value,
  })
}
demo.habitability.observe(applyFilter)
demo.nameSearch.observe(applyFilter)
```
```css
tosi-b3d {
  width: 100%;
  height: 100%;
}
.debug-panel {
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(0,0,0,0.6);
  color: white;
  padding: 8px 12px;
  border-radius: 6px;
  font: 12px monospace;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
```

## Attributes

| Attribute | Default | Description |
| --- | --- | --- |
| `seed` | `1234` | Galaxy seed |
| `dimBudget` | `95000` | The DIM population's budget. Its interesting share (~5%, HI ≤ 2) is drawn globally; the boring rest only near a point (the baker's eye) |
| `starCount` | `10000` | The galaxy's BRIGHT budget — the stars visible across it (±noise; counts round per voxel). The dim population is local and not loaded here yet |
| `radius` | `100` | Galaxy radius in scene units |
| `spiralArms` | `4` | Number of spiral arms |
| `spiralAngle` | `240` | Spiral arm sweep in degrees |
| `thickness` | `0.06` | Disk thickness (fraction of radius) |
| `particleSize` | `1.0` | Base star particle diameter |
| `maxStarApparentSize` | `0.01` | Cap on a star's apparent size as a fraction of its distance. `0` = off. Only affects the near end |
| `distantGalaxies` | `500` | External galaxies scattered isotropically outside the disc — what keeps the off-band sky from reading as empty |
| `distantStars` | `3000` | Dim far-out stars scattered isotropically outside the disc — the same emptiness budget, but for POINTS. They carry no name or system; they exist so the sky outside the band has texture |
| `coreSize` | `0.12` | Central black hole radius. Disk radii are multiples of it, so this scales the whole assembly |
