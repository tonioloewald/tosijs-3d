# body export

**A rigged body out as a GLB, from a panel.** The rows the rig tool and the
character builder put in their **Export** section: which joint names, which
rest pose, how tall, and a button that writes the body shown with
[rigged-body-glb](/rigged-body-glb/) (its springs too, from the rig recipe)
and downloads it. The file plays UAL's clips by name in three.js, Unity,
Godot and Blender; a tail or a strand swings in any VRM loader. With
**animation** set to the clip playing, that clip goes in too, retargeted onto
the skeleton as written (from UAL's file, a GLB's animations or a BVH
capture: `clip` on the target says which).

The body on screen was read through Babylon, so its materials are Babylon's.
For the file, the model it came from is read again from its bytes
([glb-rig](/glb-rig/)), and its materials go out as glTF with their
pictures. A model that is not a GLB (an OBJ) goes out in plain grey.

**Pictures** scales the file's textures down to a longest side (2048, 1024
or 512), and **compress pictures** turns opaque PNGs into JPEGs at its
**quality** ([glb textures](/glb-textures/)). With neither, every picture
goes out exactly as made.

```javascript
import { exportBodyRows } from 'tosijs-3d/body-export'
panel.push(...exportBodyRows(() => ({ body, recipe, source: { url } }), say))
```

`exportForm(pop, { name, target, say, formats })` is the same as a modal: the
file's name, its format (a GLB, or a format the host adds, such as a
character file) and the GLB's options. The character builder opens it from
its Character menu.
