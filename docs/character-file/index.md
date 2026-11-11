# character-file

**A character as one JSON document**: everything the
[character builder](/character-builder/) sets (where the body comes from, its
shape, skin, eyes, face, hair, clothes and their materials, the clip, the
tailor's work in progress) and the garments of your own it wears, so a file
opened on another machine dresses the same figure. The builder keeps the
figure you are working on in this browser (IndexedDB) and saves named ones
there too; **export** and **import** move them as files.

```javascript
import { writeCharacter, readCharacter } from 'tosijs-3d'

const doc = writeCharacter({ name: 'Ada', settings, cloth, tailor, garments })
const json = JSON.stringify(doc)
// …later, anywhere…
const { character, warnings } = readCharacter(json, defaults)
```

THE DOCUMENT IS VERSIONED. `format` is `tosijs-character` and `version` the
layout it was written in; `readCharacter` migrates an older one forward and
refuses one newer than it knows, rather than guess.

IT IS READ AGAINST THE PAGE'S DEFAULTS, so a document can never put the page
in a state it cannot draw: a setting the page does not have is dropped, one
of the wrong type is dropped, one that is missing keeps its default, and each
is listed in `warnings` (a document from a newer page, or a hand edit, then
loads as far as it can and says what it skipped).

GARMENTS TRAVEL INSIDE IT. A garment saved from the tailor lives in the
browser that saved it; the document carries each one the character wears as
its GLB (base64), so the figure is whole wherever it is opened.

SO DO ITS PICTURES: a print or texture chosen from disk for a material is
named in its recipe by a key ([material-pictures](/material-pictures/)), and
`pictures` carries each one the character's materials use (key → base64).

SO DOES ITS BODY, when it is a mesh. `bodies` says where the body on show
comes from: a URL (and the object picked in it) when it has one, or the file
itself (base64, with its name) when it was opened from disk. A page that
does not have that body makes it from there.

AND THE CLIP IT PLAYS, when that is one of your own: `clips` carries the file
it came from (a BVH capture or a GLB's animations, by file name, with its
kind), so a page that has never seen the file reads it as the builder did
([clip-store](/clip-store/)).
