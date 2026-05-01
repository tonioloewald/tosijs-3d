# b3d-particles

Declarative particle effect component wrapping Babylon.js `ParticleSystem`.
Use it for fire, smoke, explosions, thrusters, weapon trails, and more.

Supports point, box, sphere, and cone emitter shapes. Colors are specified
as CSS hex strings. Call `burst(count)` for one-shot effects like explosions.

## Demo

```js
import { b3d, b3dParticles, b3dLight, b3dSkybox, b3dGround } from 'tosijs-3d'
import { tosi, elements } from 'tosijs'
const { div, button, label, input, p } = elements

const { demo } = tosi({ demo: { emitRate: 80 } })

const explosion = b3dParticles({
  x: 3, y: 0.5, z: 0,
  capacity: 300,
  emitRate: 0,
  autoStart: false,
  minLifeTime: 0.3,
  maxLifeTime: 1.0,
  minSize: 0.1,
  maxSize: 0.6,
  minEmitPower: 4,
  maxEmitPower: 10,
  useSceneGravity: true,
  color1: '#ffffff',
  color2: '#ff8800',
  colorDead: '#330000',
  blendMode: 'additive',
  emitterShape: 'sphere',
  emitterRadius: 0.2,
})

const scene = b3d(
  {
    sceneCreated(el, BABYLON) {
      const camera = new BABYLON.ArcRotateCamera(
        'cam', -Math.PI / 2, Math.PI / 3, 12,
        new BABYLON.Vector3(0, 1, 0), el.scene
      )
      camera.attachControl(el.querySelector('canvas'), true)
      el.setActiveCamera(camera)
    },
  },
  b3dLight({ y: 1, intensity: 0.5 }),
  b3dSkybox({ timeOfDay: 12 }),
  b3dGround({ width: 20, height: 20 }),
  // Continuous fire
  b3dParticles({
    x: -3, y: 0.2, z: 0,
    autoStart: true,
    emitRate: demo.emitRate,
    minLifeTime: 0.2,
    maxLifeTime: 0.8,
    minSize: 0.05,
    maxSize: 0.3,
    minEmitPower: 1,
    maxEmitPower: 3,
    gravityY: 3,
    color1: '#ffff00',
    color2: '#ff3300',
    colorDead: '#110000',
    blendMode: 'additive',
    emitterShape: 'cone',
    emitterRadius: 0.15,
  }),
  // Smoke
  b3dParticles({
    x: -3, y: 1.2, z: 0,
    autoStart: true,
    emitRate: 20,
    minLifeTime: 1,
    maxLifeTime: 3,
    minSize: 0.2,
    maxSize: 0.8,
    minEmitPower: 0.5,
    maxEmitPower: 1.5,
    gravityY: 1,
    color1: '#444444',
    color2: '#666666',
    colorDead: '#22222200',
    emitterShape: 'sphere',
    emitterRadius: 0.2,
  }),
  // Explosion (burst on click)
  explosion,
)
preview.append(
  scene,
  div(
    { style: 'position:absolute; top:8px; right:8px; background:rgba(0,0,0,0.6); color:white; padding:8px 12px; border-radius:6px; font:12px monospace; display:flex; flex-direction:column; gap:4px' },
    p('Fire + smoke on left, click button for explosion on right'),
    button({ textContent: 'Explode!', onclick() { explosion.burst(150) } }),
    label('emit rate ', input({ type: 'range', min: 0, max: 200, step: 5, bindValue: demo.emitRate })),
  ),
)
```

## Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `x` | `0` | Emitter X position |
| `y` | `0` | Emitter Y position |
| `z` | `0` | Emitter Z position |
| `capacity` | `500` | Maximum particle count |
| `emitRate` | `50` | Particles emitted per frame |
| `minLifeTime` | `0.3` | Minimum particle lifetime (seconds) |
| `maxLifeTime` | `1.5` | Maximum particle lifetime (seconds) |
| `minSize` | `0.1` | Minimum particle size |
| `maxSize` | `0.5` | Maximum particle size |
| `minEmitPower` | `1` | Minimum emission speed |
| `maxEmitPower` | `3` | Maximum emission speed |
| `gravityX` | `0` | Gravity X component |
| `gravityY` | `-9.81` | Gravity Y component |
| `gravityZ` | `0` | Gravity Z component |
| `color1` | `'#ffff00'` | Start color 1 |
| `color2` | `'#ff6600'` | Start color 2 |
| `colorDead` | `'#000000'` | End-of-life color |
| `blendMode` | `'standard'` | `'standard'` or `'additive'` |
| `texture` | `''` | Particle texture URL (empty = default flare) |
| `emitterShape` | `'point'` | `'point'`, `'box'`, `'sphere'`, `'cone'` |
| `emitterRadius` | `0.5` | Radius for sphere/cone emitters |
| `useSceneGravity` | `false` | Use scene physics gravity instead of gravityX/Y/Z |
| `autoStart` | `false` | Start emitting when scene is ready |
| `targetStopDuration` | `0` | Auto-stop after N seconds (0 = forever) |
| `disposeOnStop` | `false` | Dispose when stopped |
| `attachTo` | `''` | Mesh name to attach emitter to |