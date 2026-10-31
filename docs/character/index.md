# character

**A character from its settings, ready to animate.** The
[character builder](/character-builder/) is a panel over this: what it sets is
a character's SETTINGS (a body, a skin, hair, clothes, a face, a rig), and
`makeCharacter` turns them into a dressed, rigged body in a scene. The same
settings, read from a [character file](/character-file/), make the same
character anywhere: a game puts it under a biped and plays clips on it.

## Demo

```js
import { b3d, b3dBiped, b3dSun, b3dLight, b3dGround, inputFocus, ualAnimationStates } from 'tosijs-3d'

preview.append(
  b3d(
    { style: 'width:100%;height:100%', gamepad: 'left_stick,right_stick' },
    b3dSun({ timeOfDay: 15, shadowTextureSize: 2048 }),
    b3dLight({ intensity: 0.5 }),
    b3dGround({ width: 40, height: 40, color: '#5d6672' }),
    inputFocus(
      b3dBiped({
        character: '/characters/casual.character.json',
        animationStates: ualAnimationStates(),
        player: true,
        cameraType: 'follow',
      })
    )
  )
)
```
```css
tosi-b3d { width: 100%; height: 100%; }
```

A character file exported from the [character builder](/character-builder/)
(**export JSON**), walking under a `<tosi-b3d-biped character="…">`: move with
WASD or the left stick, look with the mouse or the right stick. The biped
makes the character from the file and retargets UAL's clips onto it, so its
states are UAL's (`ualAnimationStates`). Making it takes a few seconds: the
body's skin is bound when it is made.

## In code

```
const assets = await loadCharacterAssets(scene)
const character = await makeCharacter(scene, assets, {
  settings: readCharacter(doc).character.settings,
  gaze: () => camera.position,
})
character.root.parent = someNode           // move it by this
const walk = retargetClip(ualWalk, ualSkeleton, character.skeleton, {
  scene, armSpaceDeg: character.recipe?.armSpaceDeg,
})
walk.start(true)
character.set({ smile: 0.6, hair: 'short02' })  // change it live
```

The body is MakeHuman's, shaped by its sliders, or a mesh from a file (a
`source`: Blender's Human Base Meshes, Quaternius' characters, your own),
rigged from its rig recipe (`rigs`, the [rig tool](/rig-tool/)'s) or its own
skin when it is skinned to UAL's skeleton. MakeHuman's body wears MakeHuman's
clothes, hair and face; any body wears the garments made on it
(`addGarment`, from the [tailor](/tailor-tool/) or Blender).

`set(changes)` applies only what changed: a slider reshapes the body, a slot
dresses it again, a colour repaints. The work is in `ready()`.

## The settings

`DEFAULT_CHARACTER` lists them with their defaults: MakeHuman's macro sliders
(`DEFAULT_HUMAN_BODY`), `tone` and `redness` (the skin), `iris` and
`irisColour`, `stubble`, the hair (`hair`, `beard`, `moustache`, `brows`,
`hairBase`, `hairHighlight`, and `hairUp`, `hairForward`, `hairSize` to
nudge it), one setting per clothes slot (`CHARACTER_SLOTS`, a garment's name
or `none`), the face (`smile`, `browsUp`, `frown`, and `blink`, `talk`),
`source` (`MakeHuman` or a mesh's name), `rigs` (each mesh's rig recipe) and
`surfaces` (each mesh's materials, `as made` or `skin`). `hideClothes` takes
everything worn off for a moment (the tailor's "hide other clothes").

Each slot's material is separate (`setCloth(slot, { look, material })`): a
garment's colourway and a material recipe over it.
