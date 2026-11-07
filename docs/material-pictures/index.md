# material pictures

**A picture chosen from disk, as a material input.** A material recipe names
its pictures by URL; a picture someone picked from their own files has no URL
that survives a reload, so it is kept here under a KEY (`picture:` + a hash
of its bytes + its file name) and the recipe carries only the key. Recipes
stay small (they are copied into undo steps, autosaves and preview caches),
and the same picture picked twice is one picture.

```javascript
import { addPicture, pictureUrl } from 'tosijs-3d'

const file = await chooseFile('image/*')
const key = await addPicture(new Uint8Array(await file.arrayBuffer()), file.name, file.type)
recipe.inputs.albedo = { image: key }   // applyMaterial resolves it
```

A character file carries the pictures its materials use (`picturesIn` finds
them, `pictureData` gives each one's bytes as base64), and reading it puts them
back (`registerPicture`), so a character made on one page wears its prints on
another. `pictureUrl` turns a key into something a texture can load (an
object URL) and passes any other URL through.
