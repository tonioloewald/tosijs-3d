import { describe, test, expect, beforeAll } from 'bun:test'

// The `.model` export convention (pure half of b3d-library): appending
// `.model` to a node name declares it an intended export — the library lists
// ONLY declared exports (under clean names) once any exist, so a working
// file's construction junk stays out of the catalog.
let modelExportNames: typeof import('./b3d-library').modelExportNames
let resolveModelName: typeof import('./b3d-library').resolveModelName

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
  const m = await import('./b3d-library')
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
})
