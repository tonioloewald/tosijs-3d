# space-backdrop

**Space, set up once**: a sun and the encoded star sky with no air, the
galaxy's band tipped off the scene's horizontal plane. Every demo that hangs
a body in space uses it ([planet](/b3d-planet/), [gas giant](/gas-giant/),
[planet-map](/planet-map/), the [star system](/b3d-star-system/)), so they
share one sky and one sun.

```javascript
import { b3d, b3dPlanet, spaceBackdrop } from 'tosijs-3d'

preview.append(b3d({}, ...spaceBackdrop(), b3dPlanet({ world: 'mars' })))
```

**Why the tilt matters.** The galaxy's disc is baked level in the sky's own
frame. Untilted, its band lies along the scene's horizontal plane, which is a
planet's equator and its ring's plane, so the Milky Way would run exactly
along Saturn's rings: tidy, and obviously staged. The default is the tilt the sky
was framed for (`SHIPPED_SKY.tilt`), the one the rest of the library uses.

**Which sky.** By default the versioned sky on `3d.tosijs.net`, which is
never rewritten, so a page keeps the sky it was made with. `sky: '/sky'` is the
doc site's latest (what its demos load). Anything else in `skybox` or `sun`
is passed through.
