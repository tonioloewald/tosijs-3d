# Spatial Attachment & Frames of Reference

Design notes for a small, unified set of mechanics for **spatial relationships
between objects** — attaching, placing-relative, and transitioning between frames
of reference. Prompted by the axis-gizmo/wrist-panel work; generalizes what the
vehicle enter/exit code already does by hand.

## The three mechanics (they are DIFFERENT)

1. **Attach — live parent (follows).** The object lives in another object's frame
   of reference and moves with it. _Prop bolted to a vehicle, a gizmo/panel on an
   XR frame, an item held in a hand, a turret on a ship._ Relationship persists.

2. **Place-relative — world offset (snapshot, does NOT follow).** Position an object
   in world space at an offset from another object, computed at insertion time; it
   then lives independently. _Spawn a crate beside a ship, drop a marker 2 m in front
   of the player, scatter debris around an explosion._ Relationship is one-shot.

3. **Transition — re-parent preserving world pose (no visual jump).** Move an object
   from one frame of reference to another without it teleporting. _Step onto / off an
   elevator or moving ship, pick up (world → hand) / put down (hand → world), board /
   leave a vehicle._ The object's on-screen pose is identical the instant before and
   after; only what it's _stable relative to_ changes.

## The key primitive: Babylon `setParent` vs `parent =`

- **`node.parent = X`** keeps the node's LOCAL transform → the node JUMPS into X's
  frame. Correct for **attach** when you're supplying a known local offset.
- **`node.setParent(X)`** preserves the node's WORLD transform → recomputes its local
  transform so it stays visually put. Correct for **transition** (no jump).
- **`node.setParent(null)`** detaches to world space, preserving world pose.

So: attach-at-offset = `parent =` + set local offset; transition = `setParent`;
place-relative = a world-space snapshot with **no** parenting.

## Floating-origin interaction (don't skip this)

The framework rebases the world periodically (`B3d.shiftOrigin`; see CLAUDE.md →
Floating origin). Anything holding a world position must opt in via
`registerWorldRoot(node)` / `addOriginListener(cb)` or it drifts on a recenter. The three
mechanics each imply the right bookkeeping:

- **Attached** to a moving carrier → the object FOLLOWS the carrier, so it must NOT be
  a world root (the carrier is, or the carrier tracks terrain). Registering it would
  double-shift it.
- **Place-relative** in world space → it's independent → it MUST be a world root.
- **Transition** → the world-root registration must FLIP as part of the re-parent:
  attaching to a carrier unregisters it; detaching to world registers it. This is
  exactly the bookkeeping the piloted-entity enter/exit already does (`shiftOrigin`
  moves the piloted carrier, not the chase rig).

## What already exists (build on it, don't reinvent)

- **Vehicle enter/exit** (`b3d-input-focus.ts`) is a specialized mechanic #3: it
  re-parents the biped into the car and back on the `interact` action.
- **XR reference frames** (`xr-frames.ts`) are `TransformNode`s — the attach targets
  for mechanic #1 (world / rig / body / neck / eye / face / hands).
- **Floating origin** (`registerWorldRoot` / `addOriginListener`) is the world-space
  bookkeeping for #2 / #3.
- **`buildAxes(scene)`** returns a bare `TransformNode` — the first thing you'd want
  to attach to a frame to tune placement.

## Proposed surface

### Imperative helpers (pure-ish transform math, unit-testable)

```
attach(child, target, { offset?, euler?, keepWorld = false })
  // parent child to target. keepWorld ? setParent (no jump) : parent= + local offset.

placeRelative(child, ref, offset)   // world snapshot; offset in ref's LOCAL frame; no parent

transition(child, newParent | null) // setParent preserving world pose + flip world-root reg via owner
detach(child) = transition(child, null)
```

The transform math (offset-in-local-frame → world position, world pose preservation)
is Babylon-`Matrix`/`Vector3` but small and deterministic — split it out and test it
headless like `fly-by-wire`/`terrain-grid`.

### Declarative (config elements, like `<tosi-b3d-panel>`)

```
<tosi-b3d-attach frame="left-hand" azimuth="…" distance="…"> …child… </tosi-b3d-attach>
<tosi-b3d-attach to="#ship" offset="0 1 -2"> …child… </tosi-b3d-attach>
<tosi-b3d-axes frame="left-hand">                <!-- the gizmo as the first payload -->
```

`frame="…"` attaches to an XR frame; `to="#id"` attaches to another scene object.
This makes wrist-panel / HUD tuning a one-attribute, in-headset iteration.

## Open questions

- **Offset frame**: local (rotated by the target) vs world. Default local (so an
  offset "in front of the ship" tracks the ship's heading).
- **Ownership of world-root flipping**: the API does it via the `B3d` owner, not the
  entity, so callers don't have to remember.
- **Animated transitions**: instant `setParent` (let animation/physics smooth the
  rest) vs a short pose lerp for boarding a moving platform. Start instant.
- **XR frames are session-scoped** (created on entry): declarative `frame=` attach
  must (re)bind on session start/end, like `<tosi-b3d-panel>` does.
