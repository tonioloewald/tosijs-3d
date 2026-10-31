# Rig tool

**Put a character on our animations, give it hair or a tail, and save the
result.** Pick one of the demo characters or load your own GLB. Check which
bone plays which role, hang spring chains on it, and try it with any of the
Universal Animation Library's clips, beside the mannequin they were made on.
Save the recipe: `applyRigRecipe` puts the same rig on the same model in a
game.

```js
import { rigTool } from 'tosijs-3d/rig-tool'

preview.closest('tosi-example')?.style.setProperty('--tosi-example-height', '600px')
preview.append(rigTool())
```

## Using it

It opens standing still in its REST pose (a T or an A), in the front view.
A mesh with no skeleton of its own (an OBJ, or a GLB without one, like the
weasels and the space marine) gets UAL's fitted to it from eight red
**markers** on its body, Mixamo's way: drag each onto its joint (chin,
groin, elbows, wrists, knees). They start where they are guessed from the
outline. A model with a skeleton of its own shows a dot on the bone each
**role** uses instead: tap a dot (it turns yellow), then the body where that
bone is.

`view` snaps to a face (front, back, left, right, top, bottom), which is how
you line a marker, joint or handle up with the flesh, and stands it still;
`free` orbits. Turn on `animate` (or pick a clip) to see it move: a mesh
whose markers or joints moved is bound to them again then (binding takes a
second or two and shows nothing at rest). In a headset you are the camera,
so the view only switches between still and playing.

The panel has these sections, its job first.

- **Markers**, for a mesh bound from them. `symmetry` moves both sides
  together; `tail` adds a tail (place its tip from the side view; it is a
  bone chain, `tail_01` on, for a spring); `guess markers` starts again from
  the outline. The joints follow the markers. `move joints` shows every
  joint (blue) to drag by hand from the view that suits: shoulders from the
  front, fingers and thumbs from the top, feet from the side. What hangs from
  a joint comes with it; set `dragging` to turn what hangs from it instead
  (a hand or foot at an angle). Markers and moved joints are saved in the
  recipe as `binding`.
- **Roles**, for a model on its own skeleton: which bone is the hips, the
  head, the left forearm, each finger joint. They are guessed from the
  names; fix one by tapping, as above, or pick a role and then the bone that
  plays it, or `(none)` to leave it out. Set `clicking sets` to the chain and
  a tap hangs the chosen spring chain there instead.
- **Motion.** `animate` and the clip; `arm space` turns the arms out from
  the body, for a character whose arms are long for its height;
  `load animations…` adds the clips in a GLB made on another rig to the
  list: Mixamo's, a mocap file's, another library's. Which bone is which is
  read from the names (UE, Mixamo, Kenney and Blender spellings), so each
  clip is retargeted onto the character, and onto the mannequin to compare.
  Mixamo downloads are FBX, which a browser cannot read: import them into
  Blender and export a GLB (with the skin).
- **View.** `view`; `mannequin` shows UAL's mannequin (a ghost) playing the
  original beside it; `bones` draws the skeleton.
- **Model.** A demo character, or `load model file…` for a GLB or OBJ of
  your own (a single file: a `.gltf` with separate buffers cannot be opened
  this way). It should face +Z, standing, arms out or down. A model with a
  skeleton of its own can `use its own skeleton`, or be bound from markers
  like any mesh.
- **Springs.** `+ strand` hangs a new chain with a tube from a bone (a
  ponytail): lay out its path with the orange handles (`+ point` for another
  beyond the tip), choose how many `links` it has (they are spaced evenly
  along the path), size it, and tune how it swings. A straight one can also
  be set by `offset`, `yaw`, `pitch` and `length`. `+ bone chain` simulates
  bones the model already has (a tail): pick the chain's first bone.
  Stiffness and damping change live; the rest rebuild the chain.
- **Recipe.** `save` downloads the recipe as JSON, `load` reads one back,
  `copy` puts it on the clipboard. The working recipe is also kept in this
  browser, per model, so a reload does not lose it.

## A recipe in a game

```
import { applyRigRecipe, readSkeleton, retargetClip } from 'tosijs-3d'

const rig = applyRigRecipe(scene, root, skeleton, recipe)
const walk = retargetClip(ualWalk, readSkeleton(ualSkeleton, ualRoot), rig.read, {
  scene,
  armSpaceDeg: recipe.armSpaceDeg,
})
walk.start(true)
```

The element `rigTool()` returns carries `.rig`: `recipe` (get a copy, set
one to apply it), `applied` and `load(model)`, for a page or an editor
driving the tool.

`rig.problems` lists anything in the recipe the model does not have (a bone
renamed since it was saved), and `rig.springs` the live chains, whose
`bones.params` can be changed while it runs.

## In an editor: mounting it in your scene

`mountRigTool(b3d, options)` opens the tool in a `<tosi-b3d>` you already
have: an editor opens it on a character and keeps the recipe
in its own document.

```javascript
import { mountRigTool } from 'tosijs-3d/rig-tool'

const tool = mountRigTool(scene, {
  models: [{ label: 'hero', url: '/hero.glb' }],
  recipe: doc.recipe, // start from the document's
  files: false, // no save / load / copy, nothing kept in the browser
  stage: false, // no floor or light: the scene's own lighting
  camera: editorCamera, // driven, and put back exactly on unmount
})
tool.addEventListener('change', (e) => preview(e.detail.recipe))
tool.addEventListener('commit', (e) => doc.record(e.detail.recipe)) // an undo step
// …
tool.unmount() // everything it added goes; safe to call twice
```

- **`change`** fires on every edit, **`commit`** once per finished gesture
  (a release on its panel or in the scene, a role assigned), each with a copy
  of the recipe.
- **Its panel is a system panel** (a button on the system bar, beside the
  host's), with the view's camera menu beside it.
- **`unmount()`** removes every mesh, material, texture, observer and panel it
  added, also if it is called while the first model is still loading, and
  restores the camera it was given: angles, distance, target, projection and
  limits. Without a camera it brings its own and puts the active one back.
- `tool.api` is the same API as the page's `.rig`; setting `api.recipe`
  applies it without echoing a `change`.

**Rigging one body for a host** (the [character builder](/character-builder/)
does this): give it `handleDone` and the panel has **done** and **cancel**
at its top. Done unmounts the tool and hands the callback the rig: the
`recipe`, and the `body` bound from its markers (a
[rigged body](/rigged-body/), ready for `buildBody` and `applyRigRecipe`).

```javascript
mountRigTool(scene, {
  models: [{ label: 'body', url: '/body.glb' }],
  recipe: { version: 1, binding }, // bind from these markers
  files: false,
  handleDone: ({ recipe, body }) => wear(body, recipe),
  handleCancel: () => {},
})
```
