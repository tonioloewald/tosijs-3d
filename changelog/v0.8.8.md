# 0.8.8

<!--{ "parent": "CHANGELOG", "order": 9991992 }-->

**Adopter fixes and folding everywhere.** Aircraft no longer crash into
explosion debris, `b3d-planet` survives high detail, and bomb and missile
blasts can be sized to a game's world (all from manta-recon). Any panel can
now fold or tab its sections (`foldSections`, from ensemble), and tabs fit
better when space is tight.

Size: barrel (min, packages external) 891.7 KB raw / 298.6 KB gz, +0.1% on
0.8.7.

## Added

- **Bomb and missile blast radii are attributes** on `<tosi-b3d-aircraft>`
  (board #2808, manta-recon): `bombFullRadius` / `bombBlastRadius` (2 / 6)
  and `missileFullRadius` / `missileBlastRadius` (1.5 / 4), like the gun's,
  so a game sizes blasts to its world.
- **Any panel can fold** (board #2805, tosijs-3d#99, from ensemble):
  `foldSections(rows, { key, mode, repaint })` returns the rows to show for
  collapsible sections, folded or as tabs, and asks for a rebuild when one
  toggles. `<tosi-b3d>`'s scene panel is built on it, so a `panel3d` of your
  own folds the same way.

## Changed

- **The active tab shrinks to its own caption** when tabs are tight (Tonio):
  a short active tab no longer takes the width of the longest, and the space
  it saves goes to the other tabs' visible slices.
  Each side stays on its side: tabs left of the active one end under it and
  tabs right of it start under it, so a narrow active tab no longer lets the
  right side cover the left side's slices.

## Fixed

- **Aircraft crashed into explosion debris** (board #2803, manta-recon): the
  sweep ray treated `fragment-N` meshes as solid, so flying through an
  explosion's remains crashed you in clear air. Fragments no longer collide
  with anything; they carry a `debris` collision group for a game that wants
  damaging debris.
- **`b3d-planet` crashed at high `subdivisions`** (board #2745, manta-recon):
  `Math.max(...vertexHeights)` overflowed the stack (160 failed, 96 worked).
  Now a loop.
