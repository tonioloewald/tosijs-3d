# city-layout

**A city's plan from a grid and a seed**: where the roads run, the blocks
between them, and the lots in each block that a building stands on. It knows
cells, never metres or models, so the same plan can be dressed with any kit
on any grid. Pure and seeded: the same options give the same city.

## Demo

```js
import { cityLayout } from 'tosijs-3d'
import { elements, svgElements } from 'tosijs'

const { svg, rect } = svgElements
const { button, div } = elements
const CELL = 14
let seed = 1

function draw() {
  const city = cityLayout({ width: 48, depth: 30, seed })
  const flip = (z, d = 1) => (city.depth - z - d) * CELL // north is up
  const cells = (r, fill) =>
    rect({ x: r.x * CELL, y: flip(r.z, r.depth), width: r.width * CELL, height: r.depth * CELL, fill, stroke: '#0004' })
  return svg(
    { viewBox: `0 0 ${city.width * CELL} ${city.depth * CELL}`, style: 'width: 100%; height: auto; background: #444' },
    ...city.roads.map((r) => rect({ x: r.x * CELL, y: flip(r.z), width: CELL, height: CELL, fill: '#555' })),
    ...city.yards.map((y) => cells(y, '#6a9a5b')),
    ...city.lots.map((l, i) => cells(l, `hsl(${(i * 47) % 360} 45% ${l.corner ? 72 : 62}%)`)),
    // A tick on each lot's street side.
    ...city.lots.map((l) => {
      const mid = { x: (l.x + l.width / 2) * CELL, y: flip(l.z, l.depth) + (l.depth * CELL) / 2 }
      const reach = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] }[l.front]
      const half = { x: (l.width * CELL) / 2, y: (l.depth * CELL) / 2 }
      return svgElements.line({ x1: mid.x, y1: mid.y, x2: mid.x + reach[0] * half.x, y2: mid.y + reach[1] * half.y, stroke: '#0006' })
    })
  )
}

const map = div(draw())
preview.append(
  map,
  button({ onClick() { seed += 1; map.replaceChildren(draw()) } }, 'another city')
)
```

Grey is road, each coloured patch a lot (corner lots lighter), green the yards
left in the middle of big blocks; the tick on each lot points at its street.

```javascript
const city = cityLayout({ width: 24, depth: 24, seed: 7 })
city.roads   // [{ x, z, piece: 'tee', turns: 1, mask: 7 }, …]
city.blocks  // [{ x, z, width, depth }, …]
city.lots    // [{ x, z, width, depth, front: 'n', corner: false, block: 3 }, …]
```

## How it is made

A city is a hierarchy, so it is made top down rather than tile by tile. The
whole area is ringed by a road, then split by a road across it, and each side
split again, until every piece is no bigger than `blockMax` cells. Each split
road runs from one existing road to another, so **every road is connected**
by construction (and the tests check it). What is left between the roads are
the blocks.

Each block is then cut into lots along its edges: a corner lot at each
corner, and lots of `lotWidth` cells along each side, `lotDepth` deep, so
**every lot faces a road**. Whatever is left in the middle of a big block is
its `yards` (a courtyard, a park, a car park).

## Road pieces

Each road cell gets its piece from which of its four neighbours are road:
`end` (one), `straight` (two opposite), `bend` (two adjacent), `tee`
(three), `cross` (four), or `single` (none). `turns` is how many quarter
turns, clockwise seen from above (north to east), take the piece from its
canonical orientation to this one:

| piece | canonical: connects |
|-------|---------------------|
| `end` | north |
| `straight` | north and south |
| `bend` | north and east |
| `tee` | north, east and south |
| `cross` | all four |

North is +Z and east is +X, cell (0, 0) at the south-west corner. Which way a
kit's model faces is the dressing's business: its manifest says how to turn
each piece to this canonical orientation.

## Options

| Option | Default | Meaning |
|--------|---------|---------|
| `width`, `depth` | | The grid, cells (x and z) |
| `seed` | `1` | Same seed, same city |
| `blockMin` | `3` | A split never leaves a block narrower than this, cells |
| `blockMax` | `6` | Blocks are split until no wider than this, cells |
| `lotWidth` | `[1, 2]` | Lots along a street, cells wide (a range) |
| `lotDepth` | `2` | How deep a lot runs back from the street, cells (less in a narrow block) |
| `ring` | `true` | A road round the edge of the whole grid (without it, lots on the outer edge face the edge, not a street) |
