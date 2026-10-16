# b3d-turret

An **auto-tracking gun** — it slews its barrel to lead a moving target and elevate for
gravity drop (how much of each is governed by `smart`; drop uses `ballisticAim` from
[ballistics.ts](?ballistics.ts)), turns within a `traverseRate` budget (`steerToward`
from [guidance.ts](?guidance.ts)), and fires [warhead](?b3d-warhead.ts) shells
([spawnProjectile](?b3d-launcher.ts)) once the target is **in range and it can
bear**. The barrel glows its `armedColor` the instant it has a firing solution — so
you can watch it acquire, lead, and open up.

## Demo

A drone **orbits** the turret; the turret tracks it, **leads** the crossing motion, and
fires when aligned (barrel glows red when it can bear). Shots arc in and blast the drone,
which **respawns at a fresh altitude** each time. It's fully automatic — no controls;
just watch it acquire, engage, and correct. The **`smart` (0..1)** slider is a skill
*curve*: at **0** it aims straight at where the target *is now* — so it whiffs the
crossing motion and, at the default low muzzle speed, **falls short**. **Leading ramps in
first — full by 0.5** — then **drop compensation** finishes ramping to **1**, elevating
the barrel for gravity. So low-smart turrets lead but shoot flat; high-smart ones lead
*and* arc their shots onto target. (0.5–1 is reserved to fold in target
acceleration/turn-rate prediction later.) Drop the traverse rate to watch it struggle to
keep up even when smart.

```js
import { b3d, b3dTurret, b3dDestroyable, b3dLight, b3dSkybox, b3dGround, label3d, slider3d, sceneDelta } from 'tosijs-3d'
import { orbitCam } from 'tosijs-3d/demo-utils'
import { tosi } from 'tosijs'

const { s } = tosi({ s: { traverseRate: 2.5, range: 30, fireRate: 2, muzzleSpeed: 24, smart: 0 } })
const turret = b3dTurret({ x: 0, y: 0, z: 0, traverseRate: s.traverseRate, range: s.range, fireRate: s.fireRate, muzzleSpeed: s.muzzleSpeed, smart: s.smart })

const scene = b3d(
  {
    scenePanelOpen: true,
    panelTitle: 'Turret',
    scenePanel: () => [
      slider3d({ label: 'traverse rate', value: s.traverseRate, min: 0.3, max: 6, step: 0.1 }),
      slider3d({ label: 'range', value: s.range, min: 8, max: 40, step: 1 }),
      slider3d({ label: 'fire rate', value: s.fireRate, min: 0.5, max: 8, step: 0.5 }),
      slider3d({ label: 'muzzle speed', value: s.muzzleSpeed, min: 15, max: 60, step: 1 }),
      slider3d({ label: 'smart (drop comp)', value: s.smart, min: 0, max: 1, step: 0.05 }),
    ],
    sceneCreated(el, BABYLON) {
      orbitCam(el, { alpha: -Math.PI / 2.2, beta: Math.PI / 3.2, radius: 34, target: [0, 3, 0] })
      let a = 0, target = null, baseY = 4
      const spawn = () => {
        baseY = 3 + Math.random() * 8 // ~3–11m, within the turret's reach
        const t = b3dDestroyable({ meshName: 'drone', x: 12, y: baseY, z: 0, size: 1.3, capacity: 24, color: '#3388dd', explode: 'on' })
        el.appendChild(t)
        return t
      }
      target = spawn()
      el.addEventListener('destroyed', () => {
        const dead = target; target = null
        if (dead) dead.remove()
        setTimeout(() => { target = spawn() }, 500)
      })
      el.scene.onBeforeRenderObservable.add(() => {
        turret.traverseRate = s.traverseRate.value
        turret.range = s.range.value
        turret.fireRate = s.fireRate.value
        turret.muzzleSpeed = s.muzzleSpeed.value
        turret.smart = s.smart.value
        a += sceneDelta(el.scene)
        if (!target || target.dead || !target.mesh) return
        target.x = Math.cos(a * 0.6) * 12
        target.z = Math.sin(a * 0.6) * 12
        target.y = baseY + Math.sin(a * 1.3) * 1.2
        turret.track(target.mesh)
      })
    },
  },
  b3dLight({ y: 1, intensity: 0.85 }),
  b3dSkybox({ timeOfDay: 10 }),
  b3dGround({ width: 60, height: 60, color: '#5a6b52' }),
  turret,
)
preview.append(scene)
```
```css
tosi-b3d { width: 100%; height: 100%; }
```

## Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `muzzleSpeed` | `35` | Shell launch speed (also the lead-solver's projectile speed) |
| `fireRate` | `2` | Max shots per second |
| `range` | `30` | Won't fire beyond this distance |
| `traverseRate` | `2.5` | Max barrel slew rate (rad/sec) |
| `smart` | `0` | Skill curve 0..1: **lead** ramps to full by **0.5**, **drop** compensation to full by **1** (0 = aim at the target's current spot). 0.5–1 reserved for acceleration/turn-rate prediction later |
| `aimTolerance` | `6` | Fires only when the barrel is within this many degrees of the solution |
| `gravity` / `drag` / `mass` | `-9.81` / `0.01` / `1` | Shell ballistics (see b3d-launcher) |
| `damage` / `fullRadius` / `blastRadius` / `los` | `20` / `1` / `2.5` / `'on'` | Warhead payload (see b3d-warhead) |
| `idleColor` | `'#4a5560'` | Barrel colour with no firing solution |
| `armedColor` | `'#e04030'` | Barrel colour when it can bear (has a solution, in range) |
| `x`,`y`,`z` | `0` | Turret base position |
