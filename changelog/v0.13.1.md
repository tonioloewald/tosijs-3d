# 0.13.1

<!--{ "parent": "CHANGELOG", "order": 9986999 }-->

Retargeted legs that hold still and walk cleanly, a foot-turn dial for splay-footed bodies, fingertip handles in the rig tool, and a character builder whose rig panel follows the bar's menus.

Size: barrel (min, packages external) 1708.6 KB raw / 594.3 KB gz, up 1.0 KB / 0.3 KB gz (+0.06%) on 0.13.0.

### Added

- `footTurnDeg` in a rig recipe (the rig tool's **foot turn** slider, under Motion): both feet turn in (negative) or out (positive) in every clip, for a body modelled with its feet turned out. Retargeting, `bakeClip`, `retargetClip` / `retargetSourceClip`, the biped, the builder and exports all pass it.
- Rig tool fingertips (orange, with `move joints` on): dragging one turns and stretches its whole finger or thumb about the finger's first joint, keeping the curl, its mirror following with symmetry on.

### Changed

- Foot IK sets only a grounded foot's HEIGHT; its place across the floor is the clip's. Pulling it to where the source's foot was dragged a body that stands wider than UAL's mannequin (MakeHuman, by 8 cm) toward the mannequin's stance and hitched every step of a walk. Crouches still plant.
- In the character builder, the Rig panel has no animate, clip or View rows: the Animation menu plays and picks the clip on the rig, and the View menu has **Mannequin** and **Bones** as checked items while rigging. `mountRigTool`'s `hostMenus` option does this for any host, which drives it through the new `api.clip`, `api.mannequin` and `api.bones`; `viewMenu` takes `items` for extra rows.
- The builder opens meshes from one place, the Character menu's **Open mesh…** (into the rig tool while rigging; otherwise a GLB is the body and an OBJ opens the rig tool). With `hostMenus` the rig tool drops its Model section, and **use its own skeleton** comes first. Its Motion section (offsets and spacing: floor, arm space, foot turn) wears the move icon, Springs the link icon.

### Fixed

- A retargeted leg that is nearly straight no longer twitches (MakeHuman's right thigh in UAL's idle). Foot IK bends a straight leg's knee toward the leg's front instead of the way a knee a few millimetres off the line happens to point.
