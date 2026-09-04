import { describe, test, expect, beforeAll } from 'bun:test'

// The `.model` export convention (pure half of b3d-library): appending
// `.model` to a node name declares it an intended export — the library lists
// ONLY declared exports (under clean names) once any exist, so a working
// file's construction junk stays out of the catalog.
let modelExportNames: typeof import('./b3d-library.js').modelExportNames
let resolveModelName: typeof import('./b3d-library.js').resolveModelName

beforeAll(async () => {
  const { Window } = await import('happy-dom')
  const win = new Window() as any
  const g = globalThis as any
  g.window ??= win
  for (const k of Object.getOwnPropertyNames(win)) {
    try {
      g[k] ??= win[k]
    } catch {
      /* off-document getters */
    }
  }
  const m = await import('./b3d-library.js')
  modelExportNames = m.modelExportNames
  resolveModelName = m.resolveModelName
})

describe('modelExportNames', () => {
  test('declared exports hide everything else and list under clean names', () => {
    expect(
      modelExportNames([
        'scout.model',
        'boolean-cutter',
        'rig-helper',
        'manta.model',
      ])
    ).toEqual(['scout', 'manta'])
  })

  test('a file with NO .model nodes keeps the legacy list-everything behaviour', () => {
    expect(modelExportNames(['scout', 'tree', 'rock'])).toEqual([
      'scout',
      'tree',
      'rock',
    ])
  })

  test('empty in, empty out', () => {
    expect(modelExportNames([])).toEqual([])
  })

  /*
  Behaviour suffixes are ANNOTATIONS, not identity. A consumer should never
  have to type a collider shape to spawn a thing — and if they did, renaming
  `_collideBox` to `_collideMesh` in Blender would silently break their code.
  (Reported by Tonio, 2026-08-12: getNames() leaked the suffix.)
  */
  test('the base mesh keeps its suffixes OUT of the public name', () => {
    expect(
      modelExportNames(['Hull_collideMesh.model', 'rock_collide_box.model'])
    ).toEqual(['Hull', 'rock'])
    expect(modelExportNames(['pad_noshadow.model'])).toEqual(['pad'])
    expect(modelExportNames(['glass_mirror.model'])).toEqual(['glass'])
    expect(modelExportNames(['scout_centerOfGravity.model'])).toEqual(['scout'])
  })

  test('suffix matching is case-insensitive and repeats', () => {
    expect(modelExportNames(['Hull_CollideMesh.model'])).toEqual(['Hull'])
    expect(modelExportNames(['Hull_collideMesh_noshadow.model'])).toEqual([
      'Hull',
    ])
  })

  test('annotated siblings that share a public name are listed ONCE', () => {
    expect(
      modelExportNames(['tree_collideBox.model', 'tree_noshadow.model'])
    ).toEqual(['tree'])
  })

  test('legacy (no .model) lists public names too', () => {
    expect(modelExportNames(['rock_collideMesh', 'tree'])).toEqual([
      'rock',
      'tree',
    ])
  })

  test('a name that merely CONTAINS a suffix word is untouched', () => {
    expect(modelExportNames(['mirror.model', 'collide.model'])).toEqual([
      'mirror',
      'collide',
    ])
  })
})

describe('resolveModelName', () => {
  test('clean name resolves to its .model node', () => {
    expect(resolveModelName(['scout.model', 'junk'], 'scout')).toBe(
      'scout.model'
    )
  })

  test('exact match wins over suffixing', () => {
    expect(resolveModelName(['scout', 'scout.model'], 'scout')).toBe('scout')
    expect(resolveModelName(['scout.model'], 'scout.model')).toBe('scout.model')
  })

  test('unknown names pass through (the caller reports the miss)', () => {
    expect(resolveModelName(['a'], 'nope')).toBe('nope')
  })

  test('a PUBLIC name resolves to its annotated node', () => {
    expect(resolveModelName(['Hull_collideMesh.model'], 'Hull')).toBe(
      'Hull_collideMesh.model'
    )
    expect(resolveModelName(['rock_collide_box'], 'rock')).toBe(
      'rock_collide_box'
    )
  })

  test('a declared .model export beats a stray node with the same public name', () => {
    expect(
      resolveModelName(['tree_noshadow', 'tree_collideMesh.model'], 'tree')
    ).toBe('tree_collideMesh.model')
  })
})
