# terrain-grid

**Where terrain tiles go.** The pure arithmetic under [[b3d-terrain]]'s
streamed level-of-detail tiles: where a tile sits in the world, which world
point each of its vertices samples, how far a level reaches, and which coarse
tiles a finer level hides. No Babylon and no DOM, so "are the tiles placed and
sampled correctly" is a unit test and not something you squint at.

```javascript
import { lodTileSize, tileCenter, cellIndex } from 'tosijs-3d/terrain-grid'

lodTileSize(128, 2) // 512: each level doubles the tile
cellIndex(700, 512) // 1: which tile a coordinate falls in
tileCenter(1, -2, 512) // { x: 512, z: -1024 }
```

You only need this if you are building on the tile substrate yourself (a
volumetric patch, a custom streamer). `desiredCells` is the quadtree: given a
viewer, the set of tiles that should exist. See also [[sdf-lattice]].
