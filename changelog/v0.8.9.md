# 0.8.9

<!--{ "parent": "CHANGELOG", "order": 9991991 }-->

**What ensemble was waiting on, and a safer publish.** Schemas for the moon,
the weather and decoration elements and sound, with sections, so a schema-
driven editor can offer the weather; `inputField` no longer leaks; fetched
attributes refuse anything but a string. And the publish now runs under the
practices template where only a code-free job can hold the npm credential.

Size: barrel (min, packages external) 898.1 KB raw / 300.5 KB gz, +0.6% on
0.8.8.

## Added

- **Schemas for the moon and the weather and decoration elements**
  (tosijs-3d#93, #97, from ensemble): `moonSchema`, `weatherCellSchema`,
  `lightningSchema`, `lightShaftsSchema`, `decoratorSchema` and
  `trailSchema`, in `sceneSchemas` as `moon`, `weatherCell`, `lightning`,
  `lightShafts`, `decorator` and `trail`. Same shape as the others (colour
  formats, the decorator's `url` as a fetched `uri-reference`, `x-useful`
  bands from the demos' sliders), held to the real elements by the drift
  test. A schema-driven consumer can now offer the weather.
- **`soundSchema`** (`sceneSchemas.sound`, tosijs-3d#95): `url` is a fetched
  `uri-reference`, so a consumer's URL rule now sees the one built-in
  fetched field it couldn't.
- **Sections in the schemas** (tosijs-3d#98): `x-sections: [{ title, icon,
  keys }]` on the skybox, cloud deck and water, so a panel generated from a
  schema can fold or tab by section (`foldSections`) without re-deriving
  the grouping. Tested: every key exists, none twice.
- **Two descriptions that stop a misreading** (manta-recon's notes): the
  cloud deck's `coverage` past 1 is thickness, not more cover, and `cirrus`
  is signed, its sign picking the axis.

## Fixed

- **`inputField` leaked itself and everything containing it**
  (tosijs-3d#96, from ensemble): every field's keyboard-toggle repaint went
  into a module-level set that was never pruned, and reached the field's
  SVG, its host, and the host's scene and engine. Ensemble measured +4000 DOM
  nodes per editor visit. The set now holds them weakly; a dropped field is
  collectable (tested: the test fails on the old code).
- **Fetched attributes are refused unless they are strings**
  (tosijs-3d#95): `String(value)` turned a JSON array like `["http://…"]`
  into the URL inside it and fetched that. Skybox, water, clouds, ground,
  decorator and sound now refuse anything but a string (`fetchedUrl`, a
  once-per-field warning). The elements still fetch whatever string they
  are given: validating URLs stays the embedder's job.

## Security

- **The publish workflow is re-copied from the practices template**: only a
  stage job running no project code holds the npm credential.
