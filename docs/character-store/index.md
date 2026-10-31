# character-store

**The characters this browser keeps**: the [character builder](/character-builder/)
saves here (the figure you are working on, and named ones), and any page on
the same site reads them back, so a game can offer the characters you built
(the [biped playground](/playground/) does).

```javascript
import { characterStore } from 'tosijs-3d'

const store = characterStore()
const names = await store.list()          // named saves, sorted
const doc = await store.get(names[0])     // a character document, whole
biped.characterDoc = doc
```

A MESH IS KEPT ONCE. What a document carries as bytes (a body opened from a
file, garments of your own) is stored apart, keyed by a hash of its content,
and each save keeps a reference to it; `get` puts the bytes back, so what
comes out is the same self-contained document that went in. Ten saves of one
figure on your own mesh hold that mesh once, and a mesh no save refers to
any more is let go. Saves made before this (the whole document in one
record) read as they are.

It lives in IndexedDB (`tosijs-characters`), so it is this browser's: a
character saved on one device is on another only if you export the file and
open it there.
