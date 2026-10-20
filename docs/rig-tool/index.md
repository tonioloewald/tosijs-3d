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

It opens standing still in its REST pose (a T or an A), with a dot on the
bone each role uses: tap a dot to choose that role (it turns yellow), then
tap the body where that bone is to give the role to it. A tap on the body
does nothing until a dot has been chosen, and only the first one counts, so
orbiting on a phone cannot reassign a bone. Set `clicking sets` to the chain
and that tap hangs the chosen spring chain there instead. A
strand's path is a row of orange handles: drag them along the tail or the
ponytail, `+ point` for another one beyond the tip. `view` snaps to front,
side or top, which is how you line a point up with the flesh. Turn on
`animate` (or pick a clip) to see it move.

The panel has four sections.

- **Model.** A demo character, or `load model file…` for a GLB of your own
  (a single file: a `.gltf` with separate buffers cannot be opened this
  way). A model needs a skeleton; one without can be rigged on the
  [auto-rig](/rig-build/) page first.
- **Roles.** Which bone is the hips, the head, the left forearm, each finger
  joint. They are guessed from the names; fix one by tapping, as above, or
  pick a role and then the bone that plays it, or `(none)` to leave it out. `arm space` turns the arms out
  from the body, for a character whose arms are long for its height.
- **Springs.** `+ strand` hangs a new chain with a tube from a bone (a
  ponytail): lay out its path with the handles (add points for a curve),
  choose how many `links` it has (they are spaced evenly along the path),
  size it, and tune how it swings. A straight one can also be set by
  `offset`, `yaw`, `pitch` and `length`. `+ bone chain` simulates bones the model already has (a
  tail): pick the chain's first bone. Stiffness and damping change live;
  the rest rebuild the chain.
- **Recipe.** `save` downloads the recipe as JSON, `load` reads one back,
  `copy` puts it on the clipboard. The working recipe is also kept in this
  browser, per model, so a reload does not lose it.

Pick a clip at the top. `mannequin` shows UAL's mannequin (a ghost) playing the
original beside it; `bones` draws the skeleton.

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
have (tosijs-3d#122): an editor opens it on a character and keeps the recipe
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
