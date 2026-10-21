# b3d-trigger

Invisible proximity zone that fires callbacks and dispatches events when
a target (the active camera or a named mesh) enters or exits a spherical
region. Useful for mission waypoints, area-of-effect zones, and cutscene
triggers.

Set `whenEnter` and `whenExit` callback properties from JavaScript, or listen
for `'enter'` / `'exit'` CustomEvents on the element.

⚠️ There is no `onEnter` / `onExit`. Passed to the element creator, an `on*` prop
is a DOM event listener, so `b3dTrigger({ onEnter })` is a listener for the
`'enter'` event and is called with an Event, not the trigger.

## Demo

```js
import { b3d, b3dTrigger, b3dSphere, b3dLight, b3dSkybox, b3dBiped, b3dGround, emptyInput } from 'tosijs-3d'
import { orbitCam } from 'tosijs-3d/demo-utils'
import { tosi, elements } from 'tosijs'
const { div, span, p } = elements

const { demo } = tosi({ demo: { status: 'walking…', dist: '' } })

// A wandering goal (a glowing marker) with a proximity trigger around it.
let goal = { x: 6, z: 5 }
const marker = b3dSphere({ meshName: 'goal', diameter: 0.7, y: 0.35, x: goal.x, z: goal.z, color: '#ffcc00' })
// Radius comfortably exceeds STOP (below) and the trigger sits low (near the
// biped's root at the feet, y≈0) — otherwise the 0.5m vertical gap eats the
// margin and a biped stopping at ~1.2m horizontal lands just outside.
const trigger = b3dTrigger({ x: goal.x, y: 0.3, z: goal.z, radius: 2, debug: true })

// The NPC: a NON-player biped driven by a tiny "walk to the goal" AI. A biped
// polls whatever is on `.inputProvider` every frame, so an AI is just an
// InputProvider emitting the same ControlInput (forward / turn) a player would.
const walker = b3dBiped({ url: '/omnidude.glb', x: -6, z: -6, initialState: 'idle' })
const STOP = 1.2 // how close counts as "arrived"
walker.inputProvider = {
  poll() {
    const m = walker.mesh
    if (!m) return emptyInput()
    const p = m.getAbsolutePosition()
    const dx = goal.x - p.x
    const dz = goal.z - p.z
    const dist = Math.hypot(dx, dz)
    // Live readout of the trigger's own view of the world (its debugState) — so
    // we can see WHY it does/doesn't fire: what target it's watching, whether that
    // target resolves, and its measured distance vs the AI's.
    const ds = trigger.debugState
    demo.dist.value =
      `AI ${dist.toFixed(1)}m · target=${ds.target} · resolved=${ds.targetResolved}` +
      ` · trigDist=${ds.distance ?? '—'} · inside=${ds.inside}`
    // Turn toward the goal (biped forward is +Z) and walk until we're there.
    const f = m.forward
    let turn = Math.atan2(dx, dz) - Math.atan2(f.x, f.z)
    while (turn > Math.PI) turn -= 2 * Math.PI
    while (turn < -Math.PI) turn += 2 * Math.PI
    return {
      ...emptyInput(),
      forward: dist > STOP ? 1 : 0,
      turn: Math.max(-1, Math.min(1, turn * 2)),
    }
  },
}

// Watch the biped (not the camera): point the trigger at its mesh once loaded.
// Give the root a KNOWN name first — a GLB root is often '__root__' or even '',
// which the trigger's getMeshByName/getTransformNodeByName lookup can't resolve.
const wire = setInterval(() => {
  if (walker.mesh) {
    walker.mesh.name = 'walker'
    // Set BOTH ways: the property, and the attribute (drives the reactive value
    // via attributeChangedCallback) — belt-and-suspenders so `target` reliably
    // becomes 'walker' instead of staying the default 'camera'.
    trigger.target = 'walker'
    trigger.setAttribute('target', 'walker')
    clearInterval(wire)
  }
}, 100)

// On arrival: pause, then teleport the goal (marker + trigger) to a random spot
// on the ground. The NPC notices the trigger it's now outside of and walks to the
// new position. Repeat forever — trigger + simple AI in a loop.
trigger.whenEnter = () => {
  demo.status.value = 'reached it — relocating…'
  setTimeout(() => {
    // Pick a spot well AWAY from the biped — otherwise the goal can land on top
    // of it, so it's already inside the relocated trigger and never exits/re-enters
    // (the loop stalls).
    const p = walker.mesh ? walker.mesh.getAbsolutePosition() : { x: 0, z: 0 }
    do {
      goal = { x: (Math.random() - 0.5) * 16, z: (Math.random() - 0.5) * 16 }
    } while (Math.hypot(goal.x - p.x, goal.z - p.z) < 5)
    marker.x = goal.x; marker.z = goal.z
    trigger.x = goal.x; trigger.z = goal.z
    demo.status.value = 'walking…'
  }, 1000)
}

preview.append(
  b3d(
    {
      sceneCreated(el, BABYLON) {
        const camera = orbitCam(el, {
          alpha: -Math.PI / 2, beta: Math.PI / 3.2, radius: 22,
          target: [0, 0, 0], maxElevationDeg: 70,
        })
        camera.lowerRadiusLimit = 8
        camera.upperRadiusLimit = 60
      },
    },
    b3dLight({ y: 1, intensity: 0.8 }),
    b3dSkybox({ timeOfDay: 12 }),
    b3dGround({ size: 20, color: '#556644' }),
    marker,
    trigger,
    walker,
  ),
  div(
    { style: 'position:absolute; top:8px; left:8px; background:rgba(0,0,0,0.6); color:white; padding:8px 12px; border-radius:6px; font:14px monospace' },
    span({ bindText: demo.status }),
    p({ style: 'opacity:0.7' }, span({ bindText: demo.dist })),
  )
)
```

> Watch it rather than drive it: an NPC walks to the marker, the trigger fires,
> the marker relocates, and it goes again. Nothing here is scripted — the
> trigger is a volume and the walking is a behaviour, and the loop is what
> happens when you put them together.
>
> The overlay is the live state: what the trigger last reported, and how far the
> NPC still has to go.

## Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `x` | `0` | Center X |
| `y` | `0` | Center Y |
| `z` | `0` | Center Z |
| `radius` | `5` | Trigger sphere radius |
| `disabled` | `false` | Disable the trigger (default: active) |
| `target` | `'camera'` | `'camera'` or a mesh name to watch |
| `debug` | `false` | Show wireframe sphere |
| `once` | `false` | Fire `whenEnter` once then deactivate |
