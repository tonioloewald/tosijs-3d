import { describe, expect, test } from 'bun:test'
import { join } from 'node:path'

/*
HEADLESS IMPORTABILITY, pinned.

Several modules exist, and the `"./*"` subpath export exists, so that an adopter
can validate a document or run a model with no browser: the barrel defines
custom elements on import and needs `HTMLElement`, so anything reachable only
through it is behind a DOM however pure it is. That property was stated in
comments (`scene-schemas.test.ts` cited this file before it existed) and pinned
by nothing — one careless `import type` → `import` would have dragged tosijs in.

Each module is imported in a FRESH subprocess, because this test runner's own
process may already have a DOM installed by some other test file.
*/

const PURE = [
  'scene-schemas',
  'light-settings',
  'color',
  'world-contract',
  'world-store',
  'world-topology',
  'wind',
  'scatter',
  'voxel-galaxy',
  'star-populations',
  'galaxy-data',
  'mersenne-twister',
  'perlin-noise',
  'table-layout',
  'flow-layout',
  'key-layout',
  'text-edit',
  'curve',
  'light-modulation',
  'fly-by-wire',
]

describe('declared-pure modules import with no DOM', () => {
  for (const name of PURE) {
    test(name, () => {
      const file = join(import.meta.dir, `${name}.ts`)
      const proc = Bun.spawnSync(
        [
          process.execPath,
          '-e',
          `if (typeof HTMLElement !== 'undefined') throw new Error('runner has a DOM');
           await import(${JSON.stringify(file)})`,
        ],
        { stderr: 'pipe', stdout: 'pipe' }
      )
      const err = new TextDecoder().decode(proc.stderr)
      expect(err.includes('error') ? err : '').toBe('')
      expect(proc.exitCode).toBe(0)
    })
  }
})

test('the guard can fail: a component module does need a DOM', () => {
  const proc = Bun.spawnSync(
    [
      process.execPath,
      '-e',
      `await import(${JSON.stringify(join(import.meta.dir, 'b3d-moon.ts'))})`,
    ],
    { stderr: 'pipe', stdout: 'pipe' }
  )
  expect(proc.exitCode).not.toBe(0)
})
