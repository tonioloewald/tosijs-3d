import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// A-CON-1: `world-contract` (+ its reference store) is the zero-dep boundary BOTH repos consume
// (tosijs-3d and Ariosto). The whole plan rests on it staying pure — no Babylon, no tosijs, and
// deterministic (ids from a counter, time only via tick()). These properties are true today by
// construction; this test LOCKS them so a future edit can't silently break the membrane. If it
// fails, you're about to make the contract un-vendorable or non-deterministic — don't.

const SRC = join(import.meta.dir)

function importsOf(file: string): string[] {
  const text = readFileSync(join(SRC, file), 'utf8')
  // Every `... from '<spec>'` (static import or re-export), plus dynamic import('<spec>').
  const specs: string[] = []
  for (const m of text.matchAll(/\bfrom\s+['"]([^'"]+)['"]/g)) specs.push(m[1])
  for (const m of text.matchAll(/\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g))
    specs.push(m[1])
  return specs
}

function isLocal(spec: string): boolean {
  return spec.startsWith('./') || spec.startsWith('../')
}

// Strip block + line comments so a determinism check doesn't trip over prose that MENTIONS
// `Date.now` while promising to avoid it (the store's own doc comment does exactly that).
function stripComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
}

describe('world-contract is a zero-dependency boundary (A-CON-1)', () => {
  test('world-contract.ts imports NOTHING (pure boundary types)', () => {
    // It defines the shared vocabulary; if it needs to import a value it has stopped being the
    // neutral middle. Types-only is fine but there is nothing here it should even type-import.
    expect(importsOf('world-contract.ts')).toEqual([])
  })

  test('world-store.ts (reference impl) pulls in no external package', () => {
    const external = importsOf('world-store.ts').filter((s) => !isLocal(s))
    // No '@babylonjs/*', no 'tosijs', no anything. Only local ./world-contract is allowed.
    expect(external).toEqual([])
  })

  test('neither the contract nor the reference store depends on Babylon or tosijs', () => {
    for (const file of ['world-contract.ts', 'world-store.ts']) {
      const specs = importsOf(file)
      expect(specs.some((s) => s.includes('@babylonjs'))).toBe(false)
      expect(specs.some((s) => s === 'tosijs' || s.startsWith('tosijs/'))).toBe(
        false
      )
    }
  })

  test('the reference store is deterministic — no wall clock, no Math.random', () => {
    // The membrane is only useful if the reference store replays identically for the conformance
    // kit and a headless driver. Time enters via tick(); ids via a counter. Guard the escapes.
    const code = stripComments(
      readFileSync(join(SRC, 'world-store.ts'), 'utf8')
    )
    expect(code).not.toMatch(/\bDate\.now\b/)
    expect(code).not.toMatch(/\bMath\.random\b/)
    expect(code).not.toMatch(/\bperformance\.now\b/)
    expect(code).not.toMatch(/\bnew Date\b/)
  })
})
