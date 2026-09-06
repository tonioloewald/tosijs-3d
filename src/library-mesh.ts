/*#
# library-mesh

**The shared "instantiate a model from a `<tosi-b3d-library>`" loader.** One
implementation, used by [[b3d-prop]] and [[b3d-destroyable]].

## Why it is shared rather than copied

It was copied first, and the copy was the problem. Three bugs arrived against
the one in `b3d-destroyable` — rotation dropped, no scale, and a node orphaned
when the element was removed mid-load (#47/#48/#49) — and a second element with
its own copy would have inherited all three, silently, because a fix in one
place cannot reach a policy that was duplicated.

That is not hypothetical here: the panel-sizing formula in this repo was copied
to three sites, fixed in one, and the two survivors were found by a review
rather than by anything failing.

⚠️ **And sharing the loader was not sufficient.** `b3d-turret` and
`b3d-launcher` both called THIS function and still dropped rotation, because
`transform`'s rotation fields were optional — so the shared implementation was
correct and two of its four callers were not. A pre-release review found it.
The fields are required now, which is what actually closes the seam: a shared
implementation only helps where the type makes the mistake unspellable.

`b3d-aircraft.loadFromLibrary` is still a separate, older loader. It is NOT the
same bug: an aircraft's attitude comes from the flight model every frame
(`fly-by-wire` writes `rotationQuaternion` in `_update`), so authored
`rx`/`ry`/`rz` could not survive on it whatever the loader did — a flying craft
is oriented by flight, not by an attribute. What it does still lack is `scale`,
a bounded wait and a missing-library error; those are in `TODO.md` under
"aircraft library loader", and its `library-changed` listener is now removed on
disposal rather than only on success.

## What it handles, and why each part exists

- **The library may connect AFTER the element.** Declaration order in a scene is
  the author's business, not a load-order contract, so it retries briefly rather
  than resolving once.
- **Rotation is passed to `instantiate`, not left to a later render.**
  `AbstractMesh.render()` does sync `rx/ry/rz`, but it is a COMPONENT render and
  has already run by the time an async load assigns the mesh — so position
  applied and rotation silently did not (#48).
- **A stale load must not land.** Remove the element inside the load window and
  the disconnect handler finds nothing to dispose, then the pending callback
  builds a node owned by nobody — a permanent ghost. Guarded with the caller's
  `loadGeneration`, which `AbstractMesh` bumps on `sceneDispose` (#49).
*/
/*{ "parent": "Core", "order": 145 }*/

import type * as BABYLON from '@babylonjs/core'
import type { B3d } from './tosi-b3d.js'

export interface LibraryMeshRequest {
  owner: B3d
  /** `<tosi-b3d-library type="…">` to take the model from. */
  type: string
  /** Model name within that library. */
  meshName: string
  /**
   * Placement, in the element's own attributes. Rotation is DEGREES.
   *
   * ⚠️ EVERY FIELD IS REQUIRED, and that is the point. They were optional, and
   * the optionality is the seam #48 re-entered through: `b3d-turret` and
   * `b3d-launcher` both passed `{x, y, z}` and silently dropped rotation, so
   * `b3dLauncher({library:'weapons', ry:180})` fired its shells backwards while
   * the same element WITHOUT `library` aimed correctly.
   *
   * `AbstractMesh` syncs rotation only in `render()`, which has already run by
   * the time an async load assigns the mesh — so nothing downstream recovers
   * it. Making the fields required means a call site cannot omit them by
   * accident; it has to say `rx: 0` and mean it.
   */
  transform: {
    x: number
    y: number
    z: number
    rx: number
    ry: number
    rz: number
  }
  /** The generation this load belongs to; a mismatch discards it. */
  generation: () => number
  /** What generation the load STARTED at. */
  started: number
  /** Called with the instantiated root. */
  onLoaded: (node: BABYLON.TransformNode) => void
  /** Which element is asking, for the error messages. */
  label: string
}

/**
 * Instantiate `meshName` from library `type`, retrying until the library exists.
 *
 * Returns a disposer that stops the retry — call it from `sceneDispose` so a
 * removed element does not hold a timer past its own life.
 */
export function loadLibraryMesh(req: LibraryMeshRequest): () => void {
  const { owner, type, meshName, transform, label } = req
  let timer: ReturnType<typeof setInterval> | null = null

  const stale = (): boolean => req.generation() !== req.started

  const tryLoad = (): boolean => {
    if (stale()) return true // stop trying; this load has been superseded
    const lib = owner.getLibrary(type)
    if (!lib) return false
    void lib.ready.then(() => {
      if (stale()) return // discard — the element is gone or reloaded
      const node = lib.instantiate(meshName, {
        x: transform.x ?? 0,
        y: transform.y ?? 0,
        z: transform.z ?? 0,
        rx: transform.rx ?? 0,
        ry: transform.ry ?? 0,
        rz: transform.rz ?? 0,
        canonical: true, // the frame fix the `url:` path does not get
      })
      if (node == null) {
        console.error(
          `${label}: could not instantiate "${meshName}" from library "${type}". ` +
            `Check the library's getNames().`
        )
        return
      }
      req.onLoaded(node as BABYLON.TransformNode)
    })
    return true
  }

  if (!tryLoad()) {
    // Poll briefly rather than forever: a missing library is an authoring
    // mistake and should say so, not hang silently.
    let tries = 0
    timer = setInterval(() => {
      if (stale()) {
        if (timer != null) clearInterval(timer)
        timer = null
        return
      }
      if (tryLoad() || ++tries > 50) {
        if (timer != null) clearInterval(timer)
        timer = null
        if (tries > 50) {
          console.error(
            `${label}: no <tosi-b3d-library type="${type}"> in this scene after 5s.`
          )
        }
      }
    }, 100)
  }

  return () => {
    if (timer != null) clearInterval(timer)
    timer = null
  }
}
