import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/*
THE ENGINE-FREE CHARACTER CORE: no Babylon, not even in its types.

These modules are promised as subpaths (`tosijs-3d/human-morph`, …) for
consumers on other engines (Dramatis's three.js embed first): a three.js
bundle with Babylon in it is a failed build, and so is a `.d.ts` that needs
Babylon installed to type-check. A type-only import is erased from the bundle,
so a bundle check alone would miss it; this walks the SOURCE import graph,
type imports included, which is what both the bundle and the emitted types are
made from.

Two rules for every module reachable from the list: it imports nothing from
`@babylonjs` (type or value), and every local module it reaches is in the list
(so the promise covers the whole closure, and a new import of an engine module
fails here, not in someone else's build). `no-dom.test.ts` separately imports
each one with no DOM.
*/

export const CHARACTER_CORE = [
  'human-pack',
  'human-morph',
  'human-rig',
  'rig-fit',
  'rig-recipe',
  'retarget',
  'bone-heat',
  'spatial-transform',
  'proxy-fit',
  'proxy-rigid',
  'hair-fit',
  'garment-cut',
  'garment-file',
  'uv-unwrap',
  'skin-tone',
  'character-file',
  'rigged-body',
  'character-settings',
  'proxy-cover',
  'asset-url',
]

/** Every import or re-export specifier in a source file, comments stripped (doc examples import the barrel). */
function specifiers(name: string): string[] {
  const src = readFileSync(join(import.meta.dir, `${name}.ts`), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1')
  const out: string[] = []
  for (const m of src.matchAll(
    /(?:^|\n)\s*(?:import|export)\b[^'"`]*?from\s*['"]([^'"]+)['"]/g
  ))
    out.push(m[1])
  for (const m of src.matchAll(/import\(\s*['"]([^'"]+)['"]\s*\)/g))
    out.push(m[1])
  return out
}

/** The closure from `roots`: modules reached, and problems found. */
function closure(roots: string[], allowed: Set<string>) {
  const seen = new Set<string>()
  const problems: string[] = []
  const walk = (name: string) => {
    if (seen.has(name)) return
    seen.add(name)
    for (const spec of specifiers(name)) {
      if (/@babylonjs/.test(spec)) problems.push(`${name} imports ${spec}`)
      else if (spec.startsWith('./')) {
        const dep = spec.slice(2).replace(/\.js$/, '')
        if (!allowed.has(dep)) problems.push(`${name} reaches ${dep}`)
        walk(dep)
      }
    }
  }
  roots.forEach(walk)
  return { seen, problems }
}

describe('the character core is engine-free', () => {
  test('no Babylon anywhere in its import graph, types included', () => {
    const { problems } = closure(CHARACTER_CORE, new Set(CHARACTER_CORE))
    expect(problems).toEqual([])
  })

  test('the check can fail: an engine module does reach Babylon', () => {
    const { problems } = closure(['rig-build'], new Set(['rig-build']))
    expect(problems.some((p) => /@babylonjs/.test(p))).toBe(true)
  })
})

test('the character-core page lists every module it promises', () => {
  const page = readFileSync(join(import.meta.dir, 'character-core.ts'), 'utf8')
  const missing = CHARACTER_CORE.filter((n) => !page.includes(`\`${n}\``))
  expect(missing).toEqual([])
})
