# gradient-filter

**A curve you can put a value through.** `PiecewiseLinearFilter` maps 0..1 to
0..1 through a list of control points, with straight lines between them.
Terrain uses one to reshape heights (a plateau, a terrace); see
[[slope-profile]] for the richer profiles built on the same idea, and
[[curve-field]] for the editable model.

```javascript
import { PiecewiseLinearFilter, plateauFilter } from 'tosijs-3d/gradient-filter'

const f = new PiecewiseLinearFilter([
  { x: 0, y: 0 },
  { x: 0.5, y: 0.1 }, // flat lowlands...
  { x: 1, y: 1 }, // ...then steep
])
f.evaluate(0.75) // 0.55

plateauFilter(4) // four flat steps
```

`identityFilter()` is the do-nothing curve.
