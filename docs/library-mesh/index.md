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
a bounded wait and a missing-library error; those are in `DECISIONS.md` under
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
