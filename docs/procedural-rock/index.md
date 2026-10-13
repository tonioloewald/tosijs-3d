# procedural-rock

**Rocks made from a seed, with no model file.** `rockGeometry` returns the
positions, normals and indices of one rock. The same seed always gives the same
rock, so a scattered field is reproducible and needs nothing from the network.

[b3d-decorator](/b3d-decorator/) uses it for every boulder and stone: a rule
names a model `rock:boulder:3` and the decorator builds it instead of looking
it up in a library. It shades them with the terrain's own biome colours, so a
rock on Mars is Mars-coloured and a rock above the snow line carries snow.

```javascript
import { rockGeometry } from 'tosijs-3d'

const rock = rockGeometry({ seed: 7, cuts: 9, squash: 0.75 })
// rock.positions, rock.normals, rock.indices
```

**Winding is counter-clockwise** (the glTF convention), and Babylon's front
face is the other way round. Handed to Babylon as they are, the triangles draw
inside out: you see the far wall of the rock through the near one. Swap two
indices of each triangle first:

```javascript
const indices = new Uint16Array(rock.indices.length)
for (let i = 0; i < indices.length; i += 3) {
  indices[i] = rock.indices[i]
  indices[i + 1] = rock.indices[i + 2]
  indices[i + 2] = rock.indices[i + 1]
}
const data = new BABYLON.VertexData()
data.positions = rock.positions
data.normals = rock.normals
data.indices = indices
data.applyToMesh(mesh)
```

The decorator does this for you.

## Names a scatter rule can use

`rock:<kind>:<n>`, where the kind is one of `boulder`, `tall`, `stone` or
`slab` (`ROCK_KINDS`) and `n` picks the seed. `rockNames('boulder', 6)` lists
six of them.

Under the decorator, a rock's own `sink` does nothing: the decorator seats
every model by its lowest point and then buries it by the RULE's `sink`
(`ScatterRule.sink`), so that is the one to change.

## How a rock is made

1. Start from a sphere.
2. **Cut it** with a handful of random planes. This is what makes it read as
   rock: flat faces meeting at blunt edges, where noise alone gives a potato.
3. Push the surface in and out with a little low-frequency noise.
4. Stretch it unevenly and squash it, so no two share a silhouette.
5. Sink the base a little below `y = 0`, so it sits IN the ground.

The result is about one unit across, with its origin on the ground under it:
the same convention as a library model, so scatter rules scale it the same way.

## Options

| Option | Default | Description |
|--------|---------|-------------|
| `seed` | `1` | Same seed, same rock |
| `detail` | `2` | Subdivisions of the starting sphere: 1 = 42 vertices, 2 = 162, 3 = 642 |
| `cuts` | `8` | How many planes cut it. More cuts, more faces |
| `roughness` | `0.07` | Depth of the noise, as a fraction of the radius |
| `squash` | `0.7` | Height relative to width. Low values give slabs |
| `sink` | `0.15` | Fraction of the height that sits below the ground |
