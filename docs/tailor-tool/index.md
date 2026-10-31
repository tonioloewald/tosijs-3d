# tailor tool

**Cut a garment out of a body, and hand it back.** Draw an outline over the
body's front view and the skin inside it, front and back, becomes cloth:
a rectangle from the waist to the ankles is a pair of trousers. The tool
works on any [rigged body](/rigged-body/) (MakeHuman's, or a mesh the
[rig tool](/rig-tool/) bound), previews the cut on the body as it moves, and
on **done** hands your callback the garment. The
[character builder](/character-builder/)'s **tailor…** opens it.

```javascript
import { mountTailorTool } from 'tosijs-3d'

const tailor = mountTailorTool(scene, {
  body, // a RiggedBody: what it cuts from
  built, // the body on screen (buildBody): what the cut is shown on
  slots: ['top', 'bottom', 'outfit'],
  handleDone: ({ garment, name, slot, look, cut }) => wardrobe.add(garment, { name, slot, look, cut }),
  handleCancel: () => {},
})
```

**Its panel is a system panel** (scissors, on the bar), with **cancel** and
**done** at its top, then:

- **the outline**: you draw the character's left, on your right, and the
  other side is its mirror. Click out points, click the first to close a
  shape, drag a point to move it, press an edge to add one;
- **thickness** (thicker cloth bridges more of the chest, where the body
  says where its nipples are) and **skirt** (rings round the outline at each
  height: skirts, kilts, robes; never the arms, which it cannot follow
  without cloth simulation);
- **material**, **name** and **slot**.

WHAT DONE HANDS BACK is the garment as a mesh at rest, on the body it was
cut from (`garment`: positions, triangles, UVs unwrapped like a sewing
pattern), with what it was cut from (`cut`: the outlines, thickness, skirt)
so it can be opened again, and the name, slot and material recipe. Binding it
to a body to wear (`bindGarment`) is the host's: a garment file carries the
same mesh.

`handleChange` hears every edit (a work in progress to keep); `setBody`
moves the cut onto a body reshaped while the tool is open; `unmount` (or
done, or cancel) removes everything it added.
