#!/usr/bin/env bun
/**
 * icon-no-stroke — put `stroke="none"` back on the parts of a `stroked/filled`
 * icon drawn with no outline (the skin icon's neck and shoulders, whose bottom
 * edge would otherwise be outlined along the icon's edge).
 *
 *   bun bin/icon-no-stroke.ts     (run by `bun run icons`, after the generator)
 *
 * tosijs-ui's generator keeps an element's own `fill:none` in that folder but
 * strips `stroke:none` with every other stroke colour (tosijs-ui#251). Element
 * order survives the generator, so each drawing element in the source is
 * matched to the same one in the output. Remove this when the generator keeps
 * `stroke:none` itself.
 */

import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const DIR = 'icons/stroked/filled'
const DATA = 'src/icon-data.ts'
const SHAPE = /<(path|circle|ellipse|rect|polygon|polyline|line)\b[^>]*>/g

const camel = (file: string) =>
  file
    .replace(/\.svg$/, '')
    .split(',')[0]
    .trim()
    .replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase())

let data = readFileSync(DATA, 'utf8')
let fixed = 0
for (const file of readdirSync(DIR).filter((f) => f.endsWith('.svg'))) {
  const source = readFileSync(join(DIR, file), 'utf8')
  const bare = [...source.matchAll(SHAPE)].map((m) =>
    /\bstroke="none"|\bstroke\s*:\s*none/.test(m[0])
  )
  if (!bare.includes(true)) continue
  const name = camel(file)
  // `  name:\n    '<svg …>',` or `  name: '<svg …>',`
  const entry = new RegExp(`(\\n  ${name}:\\s*')([^']*)(')`)
  const found = data.match(entry)
  if (!found) {
    console.warn(`icon-no-stroke: ${name} not in ${DATA}`)
    continue
  }
  let i = 0
  const markup = found[2].replace(SHAPE, (tag) => {
    const strip = bare[i++]
    return strip && !/\bstroke="none"/.test(tag)
      ? tag.replace(/^<\w+/, (open) => `${open} stroke="none"`)
      : tag
  })
  if (i !== bare.length)
    console.warn(
      `icon-no-stroke: ${name} has ${bare.length} shapes in its source, ${i} generated`
    )
  data = data.replace(entry, (_, a, _b, c) => a + markup + c)
  fixed++
}
writeFileSync(DATA, data)
console.log(`icon-no-stroke: ${fixed} icon(s) with unstroked parts`)
