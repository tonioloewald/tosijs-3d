# 0.7.2

<!--{ "parent": "CHANGELOG", "order": 9992998 }-->

## Fixed

- **`placement="world"` left dialogs at the WORLD ORIGIN** (#35) — so the pause
  and respawn panels were unreachable in any scene not centred on `(0,0,0)`, and
  a `startPaused` scene opened with no visible way out. The panel is created
  parented to the camera and then un-parented, leaving the camera-LOCAL offset
  `(0, 0, 2.2)` behind as a world position. Worse, it was re-applied every
  render: **`AbstractMesh` rewrites `mesh.position` from the element's
  `x`/`y`/`z`** (and rotation from yaw/pitch/roll), so anything that moves the
  MESH is silently undone. Both the placement and the easing now write the
  ELEMENT, which is what owns the transform.

## Added

- **`destroyable="off"` on `<tosi-b3d-destroyable>`** — place a library mesh
  without enrolling it in combat. Same knob and spelling `b3d-loader` already
  had. This element is the only way to place a library mesh BY NAME, so scenery
  had no way out: an ensemble is mostly structure, and every wall and floor was
  getting a combat record whether or not anything could shoot it. Requested by
  tosijs-3d-ensemble, whose stopgap was `armor: 100_000` — buying "cannot be
  killed" by paying for a combatant.
