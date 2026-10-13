# interactive-behavior

The **attachable** interactive — the scene-side bridge over the pure rules in
[interaction](?interaction.ts). It watches the scene's pointer, decides whether
this thing was hovered or used, and tells its host. `b3d-interactive` is a thin
element wrapper around it; attach one directly to a loader, a biped, a vehicle
or anything else that already owns a mesh.

## One implementation, flat and immersive

Babylon routes **XR controller rays through `scene.onPointerObservable`** — the
same observable a mouse feeds. So there is no XR branch here and no second code
path to keep in step: a mouse click on a canvas and a trigger pull in a headset
arrive identically, and a thing that is usable flat is usable in VR.

## It never touches the transform

An element that manages a node **owns** its transform: `AbstractMesh` rewrites
`mesh.position` and `mesh.rotationQuaternion` from its own attributes on every
render, so a behaviour that moves the *mesh* is silently undone on the next
frame. That cost a whole bug (#35), and it is a contract here rather than a note
in a doc: **this behaviour reads the scene and never writes to it.** A door that
opens moves its *element* (`ry`, `x`, …) — the thing that owns the transform.

The one visual it does own is the hover outline, which is material state, not
placement.

## Composition, not a god-feature

Other features answer "not while I say so" through `vetoes`. A `lockable` adds
one; `interactive` never learns what a lock is. Vetoes are consulted at
**activation**, not at hover — a locked door still highlights and still reports
being tried, because "it did not budge" is feedback and silence is a bug report.
A refusal names the refuser, so a caller can tell a locked door from a broken one.
