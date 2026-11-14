/*#
# b3d-npc

**Puts a mind in a biped.** Nest it in a `<tosi-b3d-biped>` and the biped
stands guard (or wanders), is oblivious until it notices the player, then
chases and attacks within reach; it loses them, searches, and goes back. A
noise sends it to look. It drives the biped exactly as a player does, with
the same `ControlInput` (AI-DESIGN: an AI is an input provider), so anything
a player's biped can do, an NPC's can.

The decisions are [npc-brain](/npc-brain/)'s and the senses
[sensorium](/sensorium/)'s, both pure and seeded. This element gives them a
body:

- **Sight**: in front (180°) out to 50 m, along a ray from its chest to the
  target's (`aimTarget`), so cover hides you.
- **Close behind**: within 10 m, ray or not.
- **Stealth**: a crouching target is noticed at `stealth` (0.33) of each
  distance, so you can creep to 3.3 m behind it.
- **Noise** ([noise](/noise/)): gunfire carries 25 m, a blast farther, a
  thrown thing where it lands; it goes to look at where the noise WAS.
- **Pain** wakes it: hurt, it knows where you are.
- **Its attack** plays `attackState` and, at the moment the blow lands, hurts
  the target if it is still within reach and in front of it.

Give the biped `health` and it can be killed: it plays its death and stops.

```javascript
import { b3dBiped, b3dNpc, ualAnimationStates, assetUrl } from 'tosijs-3d'

b3dBiped(
  {
    url: assetUrl('quaternius/UAL1_core.glb', 4),
    animationStates: ualAnimationStates([{ name: 'attack', animation: 'Sword_Attack', loop: false }]),
    x: 10, z: -10, ry: -35, health: 60,
  },
  b3dNpc({ attackDamage: 20 })
)
```

The Biped Playground has one standing guard past the crates.

## Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `target` | `'player'` | Who it is after: the player (the input focus's biped) |
| `skill` | `0` | 0..1: how often it thinks again, so how fast it reacts and how fresh its idea of where you are (dumb is the default) |
| `sightRange` | `50` | Metres it notices you in front |
| `sightDeg` | `180` | How wide "in front" is |
| `nearRange` | `10` | Metres it notices you behind it |
| `stealth` | `0.33` | What crouching multiplies those by |
| `hearing` | `1` | Multiplies how far a noise carries to it |
| `wanderRadius` | `0` | Metres it wanders from where it started; 0 stands guard |
| `memory` | `6` | Seconds it remembers you after losing you |
| `attackRange` | `1.4` | Metres it attacks from |
| `attackDamage` | `20` | What a blow does |
| `attackCooldown` | `1.6` | Seconds between attacks |
| `attackState` | `'attack'` | The biped state its attack plays |
| `walkPace` | `0.3` | Forward input while walking (0..1) |
| `runPace` | `0.7` | Forward input while chasing |
| `seed` | `1` | Its wandering and timing: the same seed, the same behaviour |

`patrol` (a property, not an attribute: `b3dNpc({ patrol: [{ x, z }, …] })`)
is a route it walks in a loop, pausing at each point.

`debugState` reads what it is doing: `{ mode, alertness, sees, senses, heard }`.
*/
/*{ "parent": "b3d-biped", "order": 30 }*/

import * as BABYLON from '@babylonjs/core'
import { B3dChild, semanticParent, sceneDelta } from './b3d-utils.js'
import { emptyInput, type ControlInput } from './control-input.js'
import { npcBrain, type NpcBrain, type NpcIntent } from './npc-brain.js'
import { noisesSince } from './noise.js'
import { sceneSeconds } from './b3d-utils.js'
import { bearingDeg, headingDeg } from './agent-driver.js'
import type { B3d } from './tosi-b3d.js'

/** The parts of a biped this uses. */
interface Body extends HTMLElement {
  mesh?: BABYLON.AbstractMesh
  aimTarget?: BABYLON.TransformNode | null
  halted?: boolean
  inputProvider?: unknown
  perform?: (state: string) => number
  damage?: (amount: number, cause?: { by?: string; kind?: 'direct' }) => void
}

/** How often the line of sight is cast, seconds. */
const LOOK_EVERY = 0.2

export class B3dNpc extends B3dChild {
  static preferredTagName = 'tosi-b3d-npc'

  static initAttributes = {
    target: 'player',
    skill: 0,
    sightRange: 50,
    sightDeg: 180,
    nearRange: 10,
    stealth: 0.33,
    hearing: 1,
    wanderRadius: 0,
    memory: 6,
    attackRange: 1.4,
    attackDamage: 20,
    attackCooldown: 1.6,
    attackState: 'attack',
    walkPace: 0.3,
    runPace: 0.7,
    seed: 1,
  }

  declare target: string
  declare skill: number
  declare sightRange: number
  declare sightDeg: number
  declare nearRange: number
  declare stealth: number
  declare hearing: number
  declare wanderRadius: number
  declare memory: number
  declare attackRange: number
  declare attackDamage: number
  declare attackCooldown: number
  declare attackState: string
  declare walkPace: number
  declare runPace: number
  declare seed: number

  /** A route it walks in a loop (world x/z points), in place of standing guard. */
  patrol: Array<{ x: number; z: number }> | null = null

  private _body: Body | null = null
  private _brain: NpcBrain | null = null
  private _intent: NpcIntent | null = null
  private _visible = false
  private _lookIn = 0
  private _heardTo = -Infinity
  private _blow: BABYLON.Observer<BABYLON.Scene> | null = null
  private _onHurt = () => {
    const t = this._target()?.mesh?.getAbsolutePosition()
    this._brain?.hurt(t ? { x: t.x, z: t.z } : undefined)
  }

  /** What it is doing, for a readout. */
  get debugState() {
    const i = this._intent
    return {
      mode: i?.mode ?? 'idle',
      alertness: Math.round((i?.alertness ?? 0) * 100) / 100,
      sees: i?.sees ?? false,
      senses: i?.senses ?? false,
      heard: i?.heard ?? false,
    }
  }

  sceneReady(owner: B3d): void {
    const body = semanticParent(this) as Body | null
    if (body == null || !('inputProvider' in body)) {
      console.warn('<tosi-b3d-npc> belongs inside a <tosi-b3d-biped>')
      return
    }
    this._body = body
    body.addEventListener('hurt', this._onHurt)
    body.inputProvider = { poll: (dt: number) => this._poll(owner, dt) }
  }

  sceneDispose(): void {
    this._body?.removeEventListener('hurt', this._onHurt)
    if (this._body?.inputProvider != null) this._body.inputProvider = null
    if (this._blow != null)
      this.owner?.scene.onBeforeRenderObservable.remove(this._blow)
    this._blow = null
    this._body = null
    this._brain = null
  }

  /** The target: the player biped, while there is one. */
  private _target(): Body | null {
    const focus = this.owner?.querySelector('tosi-b3d-input-focus') as
      | (Element & { focused?: Body | null })
      | null
    const t = focus?.focused ?? null
    return t != null && t !== this._body ? t : null
  }

  private _poll(owner: B3d, dt: number): ControlInput {
    const body = this._body
    const m = body?.mesh
    if (body == null || m == null || body.halted) return emptyInput()
    const at = m.getAbsolutePosition()
    if (this._brain == null)
      this._brain = npcBrain({
        home: { x: at.x, z: at.z },
        seed: this.seed,
        skill: this.skill,
        wanderRadius: this.wanderRadius,
        patrol: this.patrol ?? undefined,
        memory: this.memory,
        attackRange: this.attackRange,
        attackCooldown: this.attackCooldown,
        senses: {
          sightRange: this.sightRange,
          sightDeg: this.sightDeg,
          nearRange: this.nearRange,
          hearing: this.hearing,
        },
      })
    const heading = headingDeg(m.forward)
    const self = { x: at.x, z: at.z, heading }

    const target = this._target()
    const tm = target?.halted ? null : target?.mesh
    let percept: {
      x: number
      z: number
      clearLine: boolean
      conspicuity: number
    } | null = null
    if (target != null && tm != null) {
      const tp = tm.getAbsolutePosition()
      this._lookIn -= dt
      if (this._lookIn <= 0) {
        this._lookIn = LOOK_EVERY
        this._visible = this._clearLine(owner.scene, body, target)
      }
      percept = {
        x: tp.x,
        z: tp.z,
        clearLine: this._visible,
        // Crouching makes it harder to notice.
        conspicuity: (target as any)._sneaking ? this.stealth : 1,
      }
    }
    const now = sceneSeconds(owner.scene)
    const noises = noisesSince(owner.scene, this._heardTo)
    this._heardTo = now
    const intent = this._brain.step({ self, target: percept, noises }, dt)
    this._intent = intent
    if (intent.attack && target != null) this._strike(owner, body, target)

    // Steer: face where it goes (or the target, when standing to attack).
    const face =
      intent.moveTo ?? (intent.mode === 'attack' && percept ? percept : null)
    // Nowhere to go, or there already: stand, facing the way it faces.
    if (face == null || Math.hypot(face.x - at.x, face.z - at.z) < 0.6)
      return emptyInput()
    const turnDeg = bearingDeg(self, heading, face)
    const pace =
      intent.pace === 'run'
        ? this.runPace
        : intent.pace === 'walk'
        ? this.walkPace
        : 0
    // Turn on the spot first when facing well away.
    const facing = Math.max(0, 1 - Math.max(0, Math.abs(turnDeg) - 30) / 60)
    return {
      ...emptyInput(),
      forward: pace * facing,
      turn: Math.max(-1, Math.min(1, turnDeg / 45)),
    }
  }

  /** A clear line from its chest to the target's: nothing solid in between. */
  private _clearLine(scene: BABYLON.Scene, body: Body, target: Body): boolean {
    const from = (body.aimTarget ?? body.mesh)?.getAbsolutePosition()
    const to = (target.aimTarget ?? target.mesh)?.getAbsolutePosition()
    if (from == null || to == null) return false
    const dir = to.subtract(from)
    const d = dir.length()
    if (d < 1e-3) return true
    const own = (mesh: BABYLON.AbstractMesh) => {
      let n: BABYLON.Node | null = mesh
      while (n != null) {
        if (n === body.mesh || n === target.mesh) return true
        n = n.parent
      }
      return false
    }
    const hit = scene.pickWithRay(
      new BABYLON.Ray(from, dir.scale(1 / d), d),
      (mesh) => mesh.isPickable && mesh.isVisible && mesh.isEnabled() && !own(mesh)
    )
    return !(hit?.hit && hit.distance < d - 0.1)
  }

  /** Play the attack; when the blow lands, hurt the target if it is still in reach and in front. */
  private _strike(owner: B3d, body: Body, target: Body): void {
    const seconds = body.perform?.(this.attackState) ?? 0
    const scene = owner.scene
    let left = Math.max(0.15, seconds * 0.45)
    if (this._blow != null) scene.onBeforeRenderObservable.remove(this._blow)
    this._blow = scene.onBeforeRenderObservable.add(() => {
      left -= sceneDelta(scene)
      if (left > 0) return
      scene.onBeforeRenderObservable.remove(this._blow)
      this._blow = null
      const m = body.mesh
      const tm = target.mesh
      if (m == null || tm == null || body.halted || target.halted) return
      const a = m.getAbsolutePosition()
      const b = tm.getAbsolutePosition()
      const reach = Math.hypot(a.x - b.x, a.z - b.z)
      const ahead = Math.abs(
        bearingDeg({ x: a.x, z: a.z }, headingDeg(m.forward), b)
      )
      if (reach <= this.attackRange * 1.3 && ahead <= 60)
        target.damage?.(this.attackDamage, { by: 'npc', kind: 'direct' })
    })
  }
}

export const b3dNpc = B3dNpc.elementCreator()
