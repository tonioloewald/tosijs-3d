# b3d-destroyable

A thing that can take damage and be destroyed — the scene-side bridge to the pure
`CombatWorld` (see `destroyable.ts` / COMBAT-DESIGN.md). Drop it into a `<tosi-b3d>`
and it registers a Destroyable in the scene's combat world, drives a placeholder
cube mesh (real meshes/GLB later), and runs its death outcome when killed — whether
by a direct hit or a chain reaction resolved in the combat tick.

## Demo

**Click any cube** to damage it (1/click) — it flashes on a hit and dies at 0 hp. The
front grid are independent targets; the **back row is chain-linked**, so killing the
leftmost cascades the reaction down the line (chains are wired after mount, since they
reference combat ids that only exist once the targets have mounted).

```js
import { b3d, b3dDestroyable, b3dLight, b3dSkybox, b3dGround } from 'tosijs-3d'
import { orbitCam } from 'tosijs-3d/demo-utils'

const grid = []
for (let i = 0; i < 12; i++) {
  grid.push(b3dDestroyable({ x: (i % 4) * 1.6 - 2.4, y: 0.5, z: Math.floor(i / 4) * 1.6, capacity: 3, color: '#cc4444' }))
}
const chainRow = []
for (let i = 0; i < 6; i++) {
  chainRow.push(b3dDestroyable({ x: i * 1.6 - 4, y: 0.5, z: -3, capacity: 4, color: '#e0a020' }))
}

const scene = b3d(
  {
    sceneCreated(el, BABYLON) {
      orbitCam(el, { alpha: -Math.PI / 2, beta: Math.PI / 3.2, radius: 15, target: [0, 0.5, -0.5] })
      // click a cube → damage it
      el.scene.onPointerDown = (_evt, pick) => {
        if (!pick.hit || !pick.pickedMesh) return
        const t = [...grid, ...chainRow].find((c) => c.mesh === pick.pickedMesh)
        if (t) t.damage(1)
      }
    },
  },
  b3dLight({ y: 1, intensity: 0.85 }),
  b3dSkybox({ timeOfDay: 10 }),
  b3dGround({ width: 24, height: 24, color: '#5a6b52' }),
  ...grid,
  ...chainRow,
)
preview.append(scene)

// Wire the chain row once every target has mounted (its combat id exists then).
const wireChain = () => {
  if (chainRow.some((c) => !c.combatId)) { requestAnimationFrame(wireChain); return }
  for (let i = 0; i < chainRow.length - 1; i++) {
    chainRow[i].setChain([{ target: chainRow[i + 1].combatId, amount: 99, delay: 0.15 }])
  }
}
wireChain()
```
```css
tosi-b3d { width: 100%; height: 100%; }
```

## Death outcomes

What happens when it dies is configurable — the default just removes the mesh, but
you can compose:

- **`explode="on"`** — shatter the mesh into flying fragments ([b3d-exploder](?b3d-exploder.ts); `explodeForce` tunes it).
- **`deathBlast="on"`** — detonate a real AOE [warhead](?b3d-warhead.ts) at the death
  point after `blastDelay` (default 100 ms). This is a **second, distinct** chain
  mechanism from `chain`: `chain` is direct HP transfer to named targets; `deathBlast`
  is a falloff + line-of-sight **explosion** that ripples out and can set off *any*
  nearby destroyable — which may blast *its* neighbours, cascading. (`blastDamage` /
  `blastFullRadius` / `blastRadius`.)
- **`remains="<prefab>"`** — what it LEAVES BEHIND: wreckage, a burning hull, a crater,
  scattered loot. A [prefab](?prefab.ts) is a named factory that instantiates a package of
  stuff at a pose, and it's spawned at the death pose **inheriting the victim's velocity**,
  so debris keeps its momentum instead of dropping like a stone. (`remainsPrefab` takes a
  function directly, when a name won't do.)
- **`sound="<url>"`** — a positional death sound at the death point. Sugar over `remains`
  (it *is* just a `b3dSound` in a prefab), because almost every death wants one and making
  you write a factory for a single sound would be silly.
- **`whenDestroyed` callback** (set in code) + the bubbling **`destroyed`** event — the seam
  for putting a linked player/vehicle into a *dead* state, or anything `remains` can't
  express.

### Demo — a field of fuel drums that chain-explode

**Click any drum** — it explodes, and the blast sets off its neighbours in a spreading
chain reaction (each drum both `explode`s and fires a `deathBlast`).

```js
import { b3d, b3dDestroyable, b3dLight, b3dSkybox, b3dGround } from 'tosijs-3d'
import { orbitCam } from 'tosijs-3d/demo-utils'

const drums = []
for (let i = 0; i < 48; i++) {
  drums.push(b3dDestroyable({
    x: (i % 8) * 1.5 - 5.25, y: 0.5, z: Math.floor(i / 8) * 1.5 - 3.75,
    size: 0.9, capacity: 6, color: '#d06020',
    explode: 'on', explodeForce: 7,
    deathBlast: 'on', blastDamage: 30, blastFullRadius: 1.2, blastRadius: 2.4,
  }))
}

const scene = b3d(
  {
    sceneCreated(el, BABYLON) {
      orbitCam(el, { alpha: -Math.PI / 2, beta: Math.PI / 3, radius: 18, target: [0, 0.5, 0] })
      el.scene.onPointerDown = (_evt, pick) => {
        if (!pick.hit || !pick.pickedMesh) return
        const t = drums.find((d) => d.mesh === pick.pickedMesh)
        if (t) t.damage(99)
      }
    },
  },
  b3dLight({ y: 1, intensity: 0.85 }),
  b3dSkybox({ timeOfDay: 10 }),
  b3dGround({ width: 30, height: 30, color: '#5a6b52' }),
  ...drums,
)
preview.append(scene)
```
```css
tosi-b3d { width: 100%; height: 100%; }
```

It participates in the **floating origin**: because `AbstractMesh` treats the
`x/y/z` attributes as the source of truth for the mesh position, this uses
`AbstractMesh.followOrigin` to shift BOTH the mesh node and its `x/z` attributes on a rebase
(NOT `registerWorldRoot`, which would leave the attributes stale so a later render
would un-shift the mesh).

Attributes: `capacity`, `armor`, `regenRate`, `regenDelay`, `protectedBy`,
`protection`, the death-outcome knobs (`explode`/`explodeForce`, `deathBlast` +
`blastDamage`/`blastFullRadius`/`blastRadius`/`blastDelay`), plus `size`/`color` for
the placeholder cube and the usual `x/y/z`/`meshName`. Set `.chain` (a `ChainLink[]`)
in code for direct-transfer chain reactions, or `whenDestroyed` for a death hook. Call
`.damage(n)` to hurt it (a warhead will do this on contact).

## Attribution — who killed this, through what chain

`.damage(n, cause)` takes an optional `{by, kind}`, and it survives the whole
cascade: a drum that goes up because your bomb got its neighbour is still
attributed to **you**, with `via` naming the neighbour and `hops` counting the
distance.

```javascript
target.damage(40, { by: 'player', kind: 'blast' })

target.whenDestroyed = ({ id, cause }) => {
  // cause: { by: 'player', kind: 'chain', via: 'drum-17', hops: 2 }
  ledger.record(id, cause?.by)
}
```

`<tosi-b3d-warhead by="player">` credits everything its blast destroys, however
many hops away. Requested by manta-recon (#8) for a mission layer that resolves
to a **ledger of world facts** rather than a score — and a fact without
causality drives no consequence.

⚠️ **There is no friendly-fire exemption anywhere in this engine**, so `by` can
perfectly well name something the blast then destroys. That is the truth of what
happened, and the ledger should say so.
