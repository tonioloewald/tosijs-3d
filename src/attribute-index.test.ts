import { describe, test, expect } from 'bun:test'
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
