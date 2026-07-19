import { describe, expect, test } from 'bun:test'
import {
  definePrefab,
  getPrefab,
  prefabNames,
  spawnPrefab,
  type PrefabContext,
} from './prefab'

// A stub owner that just records what got appended — spawnPrefab only ever calls appendChild.
function stubOwner() {
  const appended: unknown[] = []
  const owner = {
    appendChild(el: unknown) {
      appended.push(el)
      return el
    },
  }
  return { owner: owner as unknown as PrefabContext['owner'], appended }
}

function ctx(owner: PrefabContext['owner']): PrefabContext {
  return { owner, position: { x: 0, y: 0, z: 0 } }
}

// Distinct fake "elements" — spawnPrefab treats them opaquely.
const el = (id: string) => ({ id } as unknown as Element)

describe('registry', () => {
  test('definePrefab then getPrefab returns the same function', () => {
    const p = () => null
    definePrefab('reg-a', p)
    expect(getPrefab('reg-a')).toBe(p)
  })

  test('re-registering a name replaces it (hot-reload friendly)', () => {
    const first = () => null
    const second = () => null
    definePrefab('reg-b', first)
    definePrefab('reg-b', second)
    expect(getPrefab('reg-b')).toBe(second)
  })

  test('unknown name returns null', () => {
    expect(getPrefab('reg-never-defined')).toBeNull()
  })

  test('prefabNames lists registered names', () => {
    definePrefab('reg-named', () => null)
    expect(prefabNames()).toContain('reg-named')
  })
})

describe('spawnPrefab — fail-safe branches (a missing prefab must never throw)', () => {
  test('null / undefined / empty-string name → [] and nothing appended', () => {
    const { owner, appended } = stubOwner()
    expect(spawnPrefab(null, ctx(owner))).toEqual([])
    expect(spawnPrefab(undefined, ctx(owner))).toEqual([])
    expect(spawnPrefab('', ctx(owner))).toEqual([])
    expect(appended).toHaveLength(0)
  })

  test('unknown name → [] + console.warn, no throw', () => {
    const { owner, appended } = stubOwner()
    const orig = console.warn
    const warnings: string[] = []
    console.warn = (m?: unknown) => {
      warnings.push(String(m))
    }
    try {
      expect(spawnPrefab('spawn-missing', ctx(owner))).toEqual([])
    } finally {
      console.warn = orig
    }
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain('spawn-missing')
    expect(appended).toHaveLength(0)
  })

  test('a prefab returning null / undefined → [] and nothing appended', () => {
    const { owner, appended } = stubOwner()
    definePrefab('spawn-null', () => null)
    definePrefab('spawn-void', () => undefined)
    expect(spawnPrefab('spawn-null', ctx(owner))).toEqual([])
    expect(spawnPrefab('spawn-void', ctx(owner))).toEqual([])
    expect(appended).toHaveLength(0)
  })
})

describe('spawnPrefab — production', () => {
  test('a single element is appended and returned as a one-item array', () => {
    const { owner, appended } = stubOwner()
    const e = el('solo')
    definePrefab('spawn-single', () => e)
    const out = spawnPrefab('spawn-single', ctx(owner))
    expect(out).toEqual([e])
    expect(appended).toEqual([e])
  })

  test('an array of elements is appended in order and returned', () => {
    const { owner, appended } = stubOwner()
    const a = el('a')
    const b = el('b')
    definePrefab('spawn-array', () => [a, b])
    const out = spawnPrefab('spawn-array', ctx(owner))
    expect(out).toEqual([a, b])
    expect(appended).toEqual([a, b])
  })

  test('a prefab passed DIRECTLY (not by name) works the same', () => {
    const { owner, appended } = stubOwner()
    const e = el('direct')
    const out = spawnPrefab(() => e, ctx(owner))
    expect(out).toEqual([e])
    expect(appended).toEqual([e])
  })

  test('the prefab receives the context it was called with', () => {
    const { owner } = stubOwner()
    let seen: PrefabContext | null = null
    const c: PrefabContext = {
      owner,
      position: { x: 1, y: 2, z: 3 },
      faction: 'hostile',
    }
    spawnPrefab((received) => {
      seen = received
      return null
    }, c)
    expect(seen).toBe(c)
    expect(seen!.position).toEqual({ x: 1, y: 2, z: 3 })
    expect(seen!.faction).toBe('hostile')
  })
})
