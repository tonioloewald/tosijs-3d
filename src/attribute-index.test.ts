import { describe, test, expect } from 'bun:test'
import { readFileSync } from 'node:fs'
import { buildIndex, asText } from '../bin/attribute-index.js'

/*
THE INDEX HAS TO STAY TRUE, or it is worse than not having one.

The recurring adopter failure is not a missing feature — it is a feature that
ships, is documented, and cannot be found. Three issues in one week were
already-shipped capability: `b3dAircraft.submersible` (documented a week before
the issue asking for it), `select3d`'s popup, half of #55's suggestion.

A hand-maintained index would reintroduce exactly that: it would drift, and a
stale index is a confident wrong answer rather than no answer. So it is
generated from source on every build, and these tests hold the properties that
make it worth fetching.
*/

const index = buildIndex()
const text = asText(index)
const find = (module: string) => index.find((e) => e.module === module)

describe('coverage', () => {
  test('it indexes the real elements, not a handful', () => {
    expect(index.length).toBeGreaterThan(40)
    const total = index.reduce((n, e) => n + e.attributes.length, 0)
    expect(total).toBeGreaterThan(400)
  })

  test('the core elements are all present', () => {
    for (const m of [
      'tosi-b3d',
      'b3d-aircraft',
      'b3d-terrain',
      'b3d-water',
      'b3d-skybox',
      'b3d-destroyable',
    ]) {
      expect(find(m)).toBeDefined()
    }
  })

  test('elements carry their tag, so an agent can map name → markup', () => {
    expect(find('b3d-aircraft')?.tag).toBe('tosi-b3d-aircraft')
  })
})

describe('the searches that were failing', () => {
  test('#44 — one grep for "water" surfaces `submersible`', () => {
    // The exact miss: submersible shipped 2026-08-19 and was documented in the
    // attribute table; the issue asking for it was filed a week later.
    const hits = text
      .split('\n')
      .filter((l) => /water/i.test(l) && /submersible/.test(l))
    expect(hits.length).toBeGreaterThan(0)
    expect(hits[0]).toMatch(/treating it as ground/i)
  })

  test('an attribute carries its DEFAULT and its prose, not just a name', () => {
    // A bare list of names would not have answered #44 — "submersible" only
    // helps if the line says what it does.
    const sub = find('b3d-aircraft')?.attributes.find(
      (a) => a.name === 'submersible'
    )
    expect(sub?.default).toBe('false')
    expect(sub?.description).toMatch(/water/i)
  })

  test('new capability lands in it automatically — the drift guard', () => {
    // `timeScale` was added in this same session. Nobody updated an index.
    const ts = find('tosi-b3d')?.attributes.find((a) => a.name === 'timeScale')
    expect(ts).toBeDefined()
  })
})

describe('shape', () => {
  test('undocumented attributes still appear, as a visible gap', () => {
    // Dropping them would make the index quietly incomplete, which is the one
    // thing an index must not be.
    const undocumented = index
      .flatMap((e) => e.attributes)
      .filter((a) => a.description == null)
    expect(undocumented.length).toBeGreaterThan(0)
  })

  test('no duplicate attribute names within an element', () => {
    for (const el of index) {
      const names = el.attributes.map((a) => a.name)
      expect(new Set(names).size).toBe(names.length)
    }
  })

  test('the text form is greppable — one attribute per line', () => {
    const line = text
      .split('\n')
      .find((l) => l.trim().startsWith('submersible'))
    expect(line).toBeDefined()
    expect(line!.split('\n')).toHaveLength(1)
  })
})

describe('the index reports what an element actually accepts', () => {
  /*
  THE FAILURE THIS EXISTS TO END, REPRODUCED INSIDE THE INDEX ITSELF.

  README and llms.txt both tell a reader to "search the attribute index before
  assuming a capability does not exist". It shipped omitting EVERY inherited
  attribute: `grep -c '^  rx' static/attributes.txt` returned 0, and `b3d-prop`
  listed four attributes with no way to position or rotate it.

  Two causes, both about scanning raw text. `docComment` required a file to
  BEGIN with the doc block, so `b3d-utils.ts` was skipped and
  `AbstractMesh.initAttributes` was never read; and the scanner latched onto the
  first TEXTUAL `static initAttributes`, which in that file is inside a
  doc-comment code example. The same weakness put three phantom attributes in
  the index — prose lines matching `word:` — that an agent could read, write,
  and get no error and no effect from.

  The old gates were `index.length > 40` and `total > 400`, which 63 and 688
  passed comfortably while every one of these was true.
  */
  const find = (module: string) => index.find((e) => e.module === module)
  const namesOf = (module: string) =>
    (find(module)?.attributes ?? []).map((a) => a.name)

  test('an AbstractMesh element inherits x/y/z and rx/ry/rz', () => {
    for (const module of ['b3d-prop', 'b3d-beacon', 'b3d-destroyable']) {
      const names = namesOf(module)
      for (const attr of ['x', 'y', 'z', 'rx', 'ry', 'rz']) {
        expect(names).toContain(attr)
      }
    }
  })

  test('inherited attributes come with their documentation', () => {
    // They are documented on a multi-name table row (`| `x` `y` `z` | 0 | … |`),
    // which the row parser used to drop entirely.
    const x = find('b3d-prop')?.attributes.find((a) => a.name === 'x')
    expect(x?.description).toBeTruthy()
  })

  test('an element declaring its own attributes still lists them', () => {
    expect(namesOf('b3d-prop')).toContain('meshName')
    expect(namesOf('b3d-prop')).toContain('scale')
  })

  test('no attribute name is prose scraped out of a comment', () => {
    /*
    `additive`, `Additive` and `So` all shipped as attributes. An agent greps
    one, writes `additive="on"`, and gets silence — which is the confident wrong
    answer this artifact exists to prevent.
    */
    // Capital-initial only. `x`, `y`, `z` are legitimate one-character
    // attributes — an early version of this test flagged them, which would
    // have made the guard useless the first time anyone read it.
    const suspicious = index.flatMap((e) =>
      e.attributes
        .filter((a) => /^[A-Z]/.test(a.name))
        .map((a) => `${e.module}: ${a.name}`)
    )
    expect(suspicious).toEqual([])
  })

  test('the SHIPPED artifact matches what the generator produces now', () => {
    /*
    Reads the committed file from disk, not `asText(index)` — comparing the
    generator's output to itself is a tautology, and the first version of this
    test was exactly that.

    `static/attributes.txt` is a build output committed to the tree and served
    to agents; the suite tested only the GENERATOR, so a stale artifact was
    invisible. B5 shipped through that gap.
    */
    const shipped = readFileSync('static/attributes.txt', 'utf8')
    expect(shipped.trim()).toBe(asText(buildIndex()).trim())
  })
})
