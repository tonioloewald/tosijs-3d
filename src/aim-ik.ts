/*#
# aim IK

**Point what is held where the aim goes**, by turning the spine after the
clips have posed the body. An aim pose is drawn standing; laid over a crouch it
leans with the crouch's hips, and the gun points at the floor. This measures
where the held thing actually points and turns the spine bones, a share each,
until it points along the aim.

```javascript
import { aimSpine } from 'tosijs-3d'

// Each frame, after the animations (scene.onAfterAnimationsObservable):
aimSpine([spine01, spine02, spine03], gun, aimDirection, { weight: 1, maxDeg: 70 })
```

- `chain`: the bones to turn, root first (their TransformNodes, which a glTF
  skeleton's bones are linked to)
- `held`: a node below the chain whose `forward` (its +Z) is the barrel
- `target`: the world direction to point along
- `weight` 0..1 eases it in and out; `maxDeg` caps the turn, so a target
  behind the body turns the spine only so far

It works on directions in each bone's parent's frame, so a glTF root's
handedness mirror and a uniform scale make no difference. `<tosi-b3d-biped>`
runs it on its spine while it holds a weapon in `gunplay`.
*/
/*{ "parent": "aim" }*/

import * as BABYLON from '@babylonjs/core'

export interface AimSpineOptions {
  /** 0..1: how much of the correction to apply. Default 1. */
  weight?: number
  /** The largest turn, degrees, over the whole chain. Default 70. */
  maxDeg?: number
}

/** The nodes from `node` up to (not including) `top`, top first. */
function pathBelow(
  top: BABYLON.Node,
  node: BABYLON.Node
): BABYLON.TransformNode[] | null {
  const path: BABYLON.TransformNode[] = []
  let n: BABYLON.Node | null = node
  while (n != null && n !== top) {
    path.unshift(n as BABYLON.TransformNode)
    n = n.parent
  }
  return n === top ? path : null
}

function refresh(nodes: BABYLON.TransformNode[]): void {
  for (const n of nodes) n.computeWorldMatrix(true)
}

const unit = (v: BABYLON.Vector3) => {
  const l = v.length()
  return l > 1e-9 ? v.scale(1 / l) : null
}

/**
 * Turn `chain` so `held` points along `target`. Returns the angle, degrees,
 * left between them afterwards (0 when it got there).
 */
export function aimSpine(
  chain: BABYLON.TransformNode[],
  held: BABYLON.TransformNode,
  target: BABYLON.Vector3,
  options: AimSpineOptions = {}
): number {
  const weight = Math.max(0, Math.min(1, options.weight ?? 1))
  const maxRad = ((options.maxDeg ?? 70) * Math.PI) / 180
  const want = unit(target)
  if (want == null || chain.length === 0) return 0
  const top = chain[0].parent
  const below = top != null ? pathBelow(top, held) : null
  if (top == null || below == null) return 0
  const all = [top as BABYLON.TransformNode, ...below]
  refresh(all)
  const pointing = () => unit(held.getWorldMatrix().getRow(2)!.toVector3())
  const now = pointing()
  if (now == null) return 0
  const total = Math.acos(Math.max(-1, Math.min(1, BABYLON.Vector3.Dot(now, want))))
  // The whole correction, capped and weighted, shared down the chain.
  let left = Math.min(total, maxRad) * weight
  for (let k = 0; k < chain.length && left > 1e-5; k++) {
    const bone = chain[k]
    const parent = bone.parent as BABYLON.TransformNode | null
    if (parent == null || bone.rotationQuaternion == null) continue
    const from = pointing()
    if (from == null) break
    // The two directions in the bone's PARENT's frame: a turn there is a turn
    // of this bone's local rotation, whatever mirror sits above.
    const inv = parent.getWorldMatrix().clone().invert()
    const a = unit(BABYLON.Vector3.TransformNormal(from, inv))
    const b = unit(BABYLON.Vector3.TransformNormal(want, inv))
    if (a == null || b == null) break
    const axis = unit(BABYLON.Vector3.Cross(a, b))
    const between = Math.acos(Math.max(-1, Math.min(1, BABYLON.Vector3.Dot(a, b))))
    if (axis == null || between < 1e-5) break
    const share = Math.min(between, left / (chain.length - k))
    // Which way round Babylon's axis-angle turns is checked, not assumed.
    let turn = BABYLON.Matrix.RotationAxis(axis, share)
    const test = BABYLON.Vector3.TransformNormal(a, turn)
    if (BABYLON.Vector3.Dot(test, b) < Math.cos(between - share) - 1e-4) {
      turn = BABYLON.Matrix.RotationAxis(axis, -share)
    }
    // Row vectors: the local rotation, then the turn in the parent's frame.
    const local = new BABYLON.Matrix()
    bone.rotationQuaternion.toRotationMatrix(local)
    BABYLON.Quaternion.FromRotationMatrixToRef(
      local.multiply(turn),
      bone.rotationQuaternion
    )
    left -= share
    refresh(all.slice(all.indexOf(bone)))
  }
  const after = pointing()
  return after == null
    ? 0
    : (Math.acos(Math.max(-1, Math.min(1, BABYLON.Vector3.Dot(after, want)))) *
        180) /
        Math.PI
}
