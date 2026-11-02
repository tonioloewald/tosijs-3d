# proxy-cover

**What a garment does to the skin under it**, as numbers: the half of
[human-proxy](/human-proxy/)'s `coverBody` that needs no engine, so an
exporter (or another engine) hides the skin exactly as the builder does.

- Skin a garment LISTS (`delete`) is tucked in along its normal by `tuck`
  metres, and its triangles are dropped (glasses excepted: they list the lids
  under the lenses, which they do not cover).
- Skin a garment that WRAPS the body (`BODY_WRAPPING_SLOTS`) covers without
  listing it, found by geometry from the garment's drawn positions, is tucked
  just far enough to sit under it: 4 mm, more where it is loose, never more
  than 10 mm.
- Every tuck FADES IN over `fade` metres from the edge of the covered skin,
  so a cuff or a neckline shows no dip.

```javascript
import { coverSkin } from 'tosijs-3d/proxy-cover'
const { positions, deleted } = coverSkin(untucked, normals, triangles, vertices, wearing, { drawn })
```

`coverDepths` is the rule alone (how deep each vertex goes, before the
fade), for anything that measures against it.
