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
    expect(index.length).toBeGreaterThan(60)
    const total = index.reduce((n, e) => n + e.attributes.length, 0)
    expect(total).toBeGreaterThan(800)
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

  test('inheritance is TRANSITIVE — two hops, not one', () => {
    /*
    THE GAP THE FIRST REMEDIATION LEFT, AND THE TEST THAT MISSED IT.

    `B3dControllable extends AbstractMesh` and declares no `initAttributes` of
    its own — it inherits the static through the JS class chain, which works at
    runtime and left the scanner nothing to record. So every subclass spreading
    `...B3dControllable.initAttributes` inherited an empty set, and the four
    elements a scene is most likely to contain shipped with no way to position
    them.

    The first version of this test sampled `b3d-prop`, `b3d-beacon` and
    `b3d-destroyable` — all DIRECT `AbstractMesh` subclasses, so the one shape
    that breaks was the one shape it never tried. It passed green over the
    defect, which is the same failure the review named as M7: a test that cannot
    fail is not coverage.
    */
    for (const module of [
      'b3d-aircraft',
      'b3d-biped',
      'b3d-car',
      'b3d-controller',
    ]) {
      const names = namesOf(module)
      for (const attr of ['x', 'y', 'z', 'rx', 'ry', 'rz']) {
        expect(names).toContain(attr)
      }
    }
  })

  test('an element does NOT list attributes it never declares', () => {
    /*
    THE SHAPE EVERY EARLIER TEST HERE MISSED: they assert PRESENCE and never
    absence, so a generator that over-reports passes them all.

    It over-reported badly. The class-body scan ran from a class keyword to end
    of FILE, so `class B3dChild` — which declares no `initAttributes` — absorbed
    `class AbstractMesh`'s block that follows it in `b3d-utils.ts`. Adding the
    `extends` edge made that reachable, and 33 of 54 elements grew phantom
    `x/y/z/rx/ry/rz/axes`. `<tosi-b3d-fog x="5">` read as supported and did
    nothing.

    `b3d-fog` is the witness: a direct `B3dChild` subclass, so it has no
    positional attributes at all.
    */
    for (const attr of ['x', 'y', 'z', 'rx', 'ry', 'rz', 'axes']) {
      expect(namesOf('b3d-fog')).not.toContain(attr)
    }
    // ...while still reporting what it does declare.
    expect(namesOf('b3d-fog')).toContain('density')
  })

  test('a tag belongs to the class that declares it, not the first in the file', () => {
    /*
    `b3d-biped.ts` declares a helper class before the element, and `b3d-lamp.ts`
    an abstract base before the three lamps — so a positional scan filed
    `tosi-b3d-biped` under the helper. It read correctly only because the
    unbounded body slice above was ALSO wrong, in the opposite direction.
    */
    expect(namesOf('b3d-biped')).toContain('url')
    expect(namesOf('b3d-biped')).toContain('x')
  })

  test("a spot lamp's gel is on the SPOT lamp and nowhere else", () => {
    // The multi-class file, checked in both directions. `gel` is a spot-only
    // capability; offering it on the point light is a confident wrong answer.
    const withTag = (tag: string) =>
      (index.find((e) => e.tag === tag)?.attributes ?? []).map((a) => a.name)
    expect(withTag('tosi-b3d-spot-light')).toContain('gel')
    expect(withTag('tosi-b3d-point-light')).not.toContain('gel')
  })

  test('a grouped row keeps its default and prose for every name in it', () => {
    /*
    `| \`capacity\` / \`armor\` / … | \`10\` / \`0\` / … | Combat stats |` is
    the house style, and briefly disallowing `/` in a row's separator set
    de-documented 29 real attributes — `armor = 0 — Combat stats` became a bare
    `armor`. A name with no description is what this artifact exists to stop
    shipping.
    */
    const armor = index
      .find((e) => e.module === 'b3d-aircraft')
      ?.attributes.find((a) => a.name === 'armor')
    expect(armor?.description).toBeTruthy()
    expect(armor?.default).toBe('0')
  })

  test('an element with SEVERAL classes files each under its own tag', () => {
    // `b3d-lamp.ts` declares three. Taking the first `preferredTagName` filed
    // the spot and area lamps' attributes under the point light's tag, so
    // `<tosi-b3d-point-light gel="...">` looked supported and did nothing.
    const tags = index
      .filter((e) => e.module.startsWith('b3d-lamp'))
      .map((e) => e.tag)
    expect(tags).toContain('tosi-b3d-point-light')
    expect(tags).toContain('tosi-b3d-spot-light')
    expect(tags).toContain('tosi-b3d-area-light')
  })

  test('a module with no element still documents its options', () => {
    /*
    `picker3d` is new public API in this release, `select3d`'s undiscoverable
    popup is one of the three case studies this index cites as its own
    justification, and a first attempt at excluding prose tables dropped both —
    62 real options removed to clear ~16 phantoms.
    */
    expect(namesOf('picker')).toContain('filterAbove')
    expect(namesOf('picker')).toContain('placeholder')
    expect(namesOf('widgets3d').length).toBeGreaterThan(5)
    expect(namesOf('control-input').length).toBeGreaterThan(5)
  })

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

    /*
    And no ELEMENT carries a name it does not declare. A doc page has tables of
    all sorts — preset VALUES (`motes`, `rain`), plain class fields
    (`rimCollar`, `worldU`), a perf breakdown, EVENT names (`hover`,
    `refused`), a JS-only computed accessor (`turnRateDeg`) — and harvesting
    names from them put 32 non-attributes in the index.
    */
    for (const [module, phantom] of [
      ['b3d-ambient', 'motes'],
      ['b3d-terrain', 'worldU'],
      ['b3d-terrain', 'rimCollar'],
      ['b3d-interactive', 'refused'],
      ['b3d-launcher', 'turnRateDeg'],
      ['b3d-controller', 'drive'],
    ] as const) {
      expect(namesOf(module)).not.toContain(phantom)
    }
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

describe('a table the doc happens to open with cannot eat the whole page', () => {
  /*
  B1 OF THE 0.8.1 REMEDIATION RE-REVIEW.

  `tableRows` rejected a table whose header cell names an IDENTIFIER — right,
  because `touch-gamepad`'s `| \`data-part\` | … |` maps SVG part names to
  gamepad fields and its ROWS are values, not attributes. But it applied the
  rejection to the whole DOCUMENT on the strength of the FIRST table it found.

  `b3d-lamp` opens with a capability matrix — `| | shadows | gel
  (\`projectionTexture\`) | geometry |` — so its real attribute table twelve
  headings later was never read, and all three lamp elements shipped their
  attributes as bare names: no default, no prose. `grep -c spot` went 12 → 3.

  A name with no description is exactly what this artifact exists to stop
  shipping, so the rejection has to be scoped to the table that earns it.
  */

  const attr = (tag: string, name: string) =>
    index.find((e) => e.tag === tag)?.attributes.find((a) => a.name === name)

  test('the lamps keep the prose their own table gives them', () => {
    for (const tag of [
      'tosi-b3d-point-light',
      'tosi-b3d-spot-light',
      'tosi-b3d-area-light',
    ]) {
      const a = attr(tag, 'intensity')
      expect(a, `${tag} has no intensity`).toBeDefined()
      expect(a!.description, `${tag} intensity has no prose`).toBeTruthy()
    }
  })

  test('the spot-only attributes are findable by what they DO', () => {
    // The cost of losing them is not abstract: an agent greps `gelSvg`, finds a
    // bare name, and cannot learn it is spot-only.
    for (const name of ['gel', 'gelSvg', 'angle']) {
      const a = attr('tosi-b3d-spot-light', name)
      expect(a, `spot light has no ${name}`).toBeDefined()
      expect(a!.description, `${name} has no prose`).toBeTruthy()
    }
  })

  test('and the identifier-headed table is STILL rejected', () => {
    /*
    The guard's original job, and scoping the rejection must not quietly
    re-admit it. `touch-gamepad` maps SVG `data-part` values to gamepad fields,
    so its rows are VALUES: an index offering `left_stick` as an attribute you
    could write is the confident wrong answer this artifact must never produce.

    Asserted against the parsed NAMES, not the text — `left_stick` legitimately
    appears inside `tosi-b3d`'s `gamepad` description, and a substring check
    over the whole file would have called that a failure.
    */
    const names = new Set(index.flatMap((e) => e.attributes.map((a) => a.name)))
    expect(names.has('left_stick')).toBe(false)
    expect(names.has('right_stick')).toBe(false)
    expect(names.has('data-part')).toBe(false)
  })
})
