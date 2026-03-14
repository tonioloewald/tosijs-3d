#!/usr/bin/env bun
/*#
# svg-to-code

Converts an SVG file into a TypeScript function that builds the same SVG
programmatically using tosijs `svgElements`. This lets you design assets in
a vector editor, then generate code that can be parameterized (colors, labels,
visibility) at runtime — useful for HUD elements, touch controls, gauges,
and other dynamic UI that you want to render as a texture via
[b3d-svg-plane](/?b3d-svg-plane.ts) or use directly in the DOM as a
[touch-gamepad](/?touch-gamepad.ts) overlay.

Inline styles are decomposed into presentation attributes and color values
are extracted as named parameters with defaults.

## Usage

    bun bin/svg-to-code.ts input.svg > output.ts
    bun bin/svg-to-code.ts input.svg --data-part   # convert id → data-part
    bun bin/svg-to-code.ts input.svg --fn myFunc    # custom function name

## Options

| Flag | Description |
|------|-------------|
| `--data-part` | Convert `id` attributes to `data-part` (for DOM usage) |
| `--fn <name>` | Set the exported function name (default: `generatedSvg`) |

## What it does

1. Parses SVG XML (regex-based, no DOM dependency)
2. Decomposes inline `style` attributes into SVG presentation attributes
3. Extracts color values as named parameters with defaults
4. Unwraps bare `<g>` wrapper elements (e.g. `Layer_1`)
5. Outputs a TypeScript function that builds the SVG using tosijs `svgElements`

## Example output

Given an SVG with colored paths, the converter produces:

```typescript
import { svgElements } from 'tosijs'

const { svg, path } = svgElements

const DEFAULTS = {
  fillA: '#ff0000',
  strokeA: '#000000',
}

export type GeneratedSvgColors = Partial<typeof DEFAULTS>

export default function generatedSvg(colors: GeneratedSvgColors = {}) {
  colors = { ...DEFAULTS, ...colors }
  return svg(
    { viewBox: '0 0 100 100' },
    path({ 'data-part': 'A', d: 'M0,0 L10,10', fill: colors.fillA })
  )
}
```
*/

import { parseArgs } from 'util'

// --- Style parsing ---

/** Parse an inline style string into key-value pairs */
export function parseStyle(style: string): Record<string, string> {
  const result: Record<string, string> = {}
  for (const part of style.split(';')) {
    const colon = part.indexOf(':')
    if (colon === -1) continue
    const key = part.slice(0, colon).trim()
    const value = part.slice(colon + 1).trim()
    if (key && value) result[key] = value
  }
  return result
}

/** Check if a CSS value looks like a color */
export function isColor(value: string): boolean {
  if (value.startsWith('#')) return true
  if (value.startsWith('rgb')) return true
  if (value.startsWith('hsl')) return true
  // Named colors — only common ones, not exhaustive
  const named = [
    'none',
    'transparent',
    'white',
    'black',
    'red',
    'green',
    'blue',
    'yellow',
    'cyan',
    'magenta',
    'orange',
    'purple',
    'gray',
    'grey',
  ]
  return named.includes(value.toLowerCase())
}

/** CSS property name → valid JS identifier for svgElements attribute */
export function cssToAttr(prop: string): string {
  // SVG presentation attributes use the same names as CSS properties
  // but svgElements accepts them as object keys (kebab-case strings)
  return prop
}

// --- SVG element extraction ---

export interface SvgElementData {
  tag: string
  id: string
  attrs: Record<string, string> // non-style, non-id attributes
  styles: Record<string, string> // all decomposed style properties
  colors: Record<string, string> // style prop → color value (extracted)
  children: SvgElementData[]
}

/** Extract structured data from an SVG element and its children */
export function extractElement(el: Element): SvgElementData {
  const tag = el.tagName.toLowerCase()
  const id = el.getAttribute('id') || ''
  const attrs: Record<string, string> = {}
  const styles: Record<string, string> = {}
  const colors: Record<string, string> = {}

  for (const attr of Array.from(el.attributes)) {
    if (attr.name === 'id') continue
    if (attr.name === 'xmlns' || attr.name.startsWith('xmlns:')) continue
    if (attr.name === 'style') {
      const parsed = parseStyle(attr.value)
      for (const [key, value] of Object.entries(parsed)) {
        styles[key] = value
        if (isColor(value)) {
          colors[key] = value
        }
      }
    } else {
      attrs[attr.name] = attr.value
    }
  }

  const children: SvgElementData[] = []
  for (const child of Array.from(el.children)) {
    children.push(extractElement(child))
  }

  return { tag, id, attrs, styles, colors, children }
}

// --- Regex-based SVG parser (no DOM dependency) ---

interface RawSvgNode {
  tag: string
  attrs: Record<string, string>
  children: RawSvgNode[]
}

/** Parse SVG XML into a tree using regex (no DOM needed) */
export function parseSvgXml(xml: string): RawSvgNode {
  // Remove XML declaration and comments
  xml = xml.replace(/<\?xml[^?]*\?>/g, '').replace(/<!--[\s\S]*?-->/g, '')

  return parseNode(xml.trim())
}

function parseNode(xml: string): RawSvgNode {
  // Match opening tag
  const openMatch = xml.match(
    /^<(\w[\w-]*)((?:\s+[\w:.-]+(?:\s*=\s*"[^"]*")?)*)\s*(\/?)>/
  )
  if (!openMatch) {
    return { tag: 'unknown', attrs: {}, children: [] }
  }

  const tag = openMatch[1]
  const attrString = openMatch[2]
  const selfClosing = openMatch[3] === '/'
  const attrs = parseAttrs(attrString)

  if (selfClosing) {
    return { tag, attrs, children: [] }
  }

  // Find matching close tag and extract inner content
  const afterOpen = xml.slice(openMatch[0].length)
  const closeTag = `</${tag}>`
  const closeIdx = findMatchingClose(afterOpen, tag)
  const inner = afterOpen.slice(0, closeIdx).trim()

  const children = parseChildren(inner)

  return { tag, attrs, children }
}

function parseAttrs(attrString: string): Record<string, string> {
  const attrs: Record<string, string> = {}
  const re = /([\w:.-]+)\s*=\s*"([^"]*)"/g
  let m
  while ((m = re.exec(attrString)) !== null) {
    attrs[m[1]] = m[2]
  }
  return attrs
}

function findMatchingClose(xml: string, tag: string): number {
  let depth = 1
  let pos = 0
  const openRe = new RegExp(`<${tag}[\\s/>]`, 'g')
  const closeRe = new RegExp(`</${tag}>`, 'g')

  while (depth > 0 && pos < xml.length) {
    openRe.lastIndex = pos
    closeRe.lastIndex = pos

    const openMatch = openRe.exec(xml)
    const closeMatch = closeRe.exec(xml)

    if (!closeMatch) break

    if (openMatch && openMatch.index < closeMatch.index) {
      // Check if it's self-closing
      const afterTag = xml.slice(
        openMatch.index,
        xml.indexOf('>', openMatch.index) + 1
      )
      if (!afterTag.endsWith('/>')) {
        depth++
      }
      pos = openMatch.index + openMatch[0].length
    } else {
      depth--
      if (depth === 0) return closeMatch.index
      pos = closeMatch.index + closeMatch[0].length
    }
  }

  return xml.length
}

function parseChildren(inner: string): RawSvgNode[] {
  const children: RawSvgNode[] = []
  let remaining = inner.trim()

  while (remaining.length > 0) {
    // Skip text nodes
    if (!remaining.startsWith('<')) {
      const nextTag = remaining.indexOf('<')
      if (nextTag === -1) break
      remaining = remaining.slice(nextTag)
      continue
    }

    // Skip comments
    if (remaining.startsWith('<!--')) {
      const endComment = remaining.indexOf('-->')
      if (endComment === -1) break
      remaining = remaining.slice(endComment + 3).trim()
      continue
    }

    const child = parseNode(remaining)
    children.push(child)

    // Advance past this element
    const openMatch = remaining.match(
      /^<(\w[\w-]*)((?:\s+[\w:.-]+(?:\s*=\s*"[^"]*")?)*)\s*(\/?)>/
    )
    if (!openMatch) break

    if (openMatch[3] === '/') {
      remaining = remaining.slice(openMatch[0].length).trim()
    } else {
      const closeTag = `</${child.tag}>`
      const afterOpen = remaining.slice(openMatch[0].length)
      const closeIdx = findMatchingClose(afterOpen, child.tag)
      remaining = afterOpen.slice(closeIdx + closeTag.length).trim()
    }
  }

  return children
}

/** Convert a raw parsed node to SvgElementData */
export function rawToElementData(node: RawSvgNode): SvgElementData {
  const { tag, attrs: rawAttrs, children: rawChildren } = node
  const id = rawAttrs.id || ''
  const attrs: Record<string, string> = {}
  const styles: Record<string, string> = {}
  const colors: Record<string, string> = {}

  for (const [key, value] of Object.entries(rawAttrs)) {
    if (key === 'id') continue
    if (key === 'xmlns' || key.startsWith('xmlns:')) continue
    if (key === 'style') {
      const parsed = parseStyle(value)
      for (const [k, v] of Object.entries(parsed)) {
        styles[k] = v
        if (isColor(v)) {
          colors[k] = v
        }
      }
    } else {
      attrs[key] = value
    }
  }

  const children = rawChildren.map(rawToElementData)
  return { tag, id, attrs, styles, colors, children }
}

/** Parse SVG string into structured data (no DOM dependency) */
export function extractSvgFromString(svgString: string): SvgElementData {
  const raw = parseSvgXml(svgString)
  return rawToElementData(raw)
}

// --- Code generation ---

export interface CodeGenOptions {
  /** Convert id attributes to data-part (for DOM usage) */
  dataPart?: boolean
  /** Function name for the generated code */
  functionName?: string
  /** Indent string */
  indent?: string
}

/** Generate a color parameter name from element id and style property */
function colorParamName(id: string, prop: string): string {
  // e.g., id="A", prop="fill" → "fillA"
  // e.g., id="left_bumper", prop="fill" → "fillLeftBumper"
  const camel = id.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
  const propCamel = prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase())
  return propCamel + camel.charAt(0).toUpperCase() + camel.slice(1)
}

/** Collect all unique colors from the element tree */
export function collectColors(
  el: SvgElementData,
  result: Map<string, { paramName: string; defaultValue: string }> = new Map()
): Map<string, { paramName: string; defaultValue: string }> {
  if (el.id && Object.keys(el.colors).length > 0) {
    for (const [prop, value] of Object.entries(el.colors)) {
      const key = `${el.id}:${prop}`
      result.set(key, {
        paramName: colorParamName(el.id, prop),
        defaultValue: value,
      })
    }
  }
  for (const child of el.children) {
    collectColors(child, result)
  }
  return result
}

/** Generate the TypeScript code for an element */
function genElement(
  el: SvgElementData,
  colors: Map<string, { paramName: string; defaultValue: string }>,
  opts: CodeGenOptions,
  depth: number
): string {
  const ind = (opts.indent || '  ').repeat(depth)
  const ind1 = (opts.indent || '  ').repeat(depth + 1)

  // Skip wrapper elements like <g id="Layer_1"> — inline their children
  if (
    el.tag === 'g' &&
    el.children.length > 0 &&
    Object.keys(el.styles).length === 0 &&
    Object.keys(el.attrs).length === 0
  ) {
    return el.children
      .map((c) => genElement(c, colors, opts, depth))
      .join(',\n')
  }

  const propsEntries: string[] = []

  // id or data-part
  if (el.id) {
    if (opts.dataPart) {
      propsEntries.push(`'data-part': '${el.id}'`)
    } else {
      propsEntries.push(`id: '${el.id}'`)
    }
  }

  // Regular attributes
  for (const [key, value] of Object.entries(el.attrs)) {
    // Quote keys with hyphens
    const keyStr = key.includes('-') ? `'${key}'` : key
    propsEntries.push(`${keyStr}: '${value}'`)
  }

  // Style properties as presentation attributes, with colors parameterized
  for (const [prop, value] of Object.entries(el.styles)) {
    const colorKey = `${el.id}:${prop}`
    const colorInfo = colors.get(colorKey)
    const propStr = prop.includes('-') ? `'${prop}'` : prop
    if (colorInfo) {
      propsEntries.push(`${propStr}: colors.${colorInfo.paramName}`)
    } else {
      propsEntries.push(`${propStr}: '${value}'`)
    }
  }

  const propsStr =
    propsEntries.length > 0 ? `{ ${propsEntries.join(', ')} }` : ''

  if (el.children.length === 0) {
    return `${ind}${el.tag}(${propsStr})`
  }

  const childrenStr = el.children
    .map((c) => genElement(c, colors, opts, depth + 1))
    .join(',\n')

  return `${ind}${el.tag}(\n${ind1}${propsStr}${
    propsStr ? ',\n' : ''
  }${childrenStr}\n${ind})`
}

/** Generate complete TypeScript source from parsed SVG data */
export function generateCode(
  svgData: SvgElementData,
  opts: CodeGenOptions = {}
): string {
  const functionName = opts.functionName || 'generatedSvg'
  const colors = collectColors(svgData)

  // Build the colors interface
  const colorEntries = Array.from(colors.entries())
  const defaultsLines = colorEntries
    .map(
      ([_, { paramName, defaultValue }]) => `  ${paramName}: '${defaultValue}',`
    )
    .join('\n')

  // Determine which svgElements tags are used
  const tags = new Set<string>()
  function collectTags(el: SvgElementData) {
    tags.add(el.tag)
    el.children.forEach(collectTags)
  }
  collectTags(svgData)
  tags.delete('svg') // svg is always needed
  const tagList = ['svg', ...Array.from(tags).sort()].join(', ')

  // Generate the element tree (skip the root svg's wrapper, we generate it manually)
  const childrenCode = svgData.children
    .map((c) => genElement(c, colors, opts, 2))
    .join(',\n')

  // Root svg attributes
  const rootAttrs: string[] = []
  for (const [key, value] of Object.entries(svgData.attrs)) {
    const keyStr = key.includes('-') ? `'${key}'` : key
    rootAttrs.push(`${keyStr}: '${value}'`)
  }
  const rootAttrsStr = rootAttrs.length > 0 ? `{ ${rootAttrs.join(', ')} }` : ''

  const code = `import { svgElements } from 'tosijs'

const { ${tagList} } = svgElements

const DEFAULTS = {
${defaultsLines}
}

export type ${capitalize(functionName)}Colors = Partial<typeof DEFAULTS>

export default function ${functionName}(colors: ${capitalize(
    functionName
  )}Colors = {}) {
  colors = { ...DEFAULTS, ...colors }
  return svg(
    ${rootAttrsStr}${rootAttrsStr && childrenCode ? ',\n' : ''}
${childrenCode}
  )
}
`

  return code
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// --- CLI ---

if (import.meta.main) {
  const { values, positionals } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      'data-part': { type: 'boolean', default: false },
      fn: { type: 'string', default: 'generatedSvg' },
      help: { type: 'boolean', short: 'h', default: false },
    },
    allowPositionals: true,
  })

  if (values.help || positionals.length === 0) {
    console.log(`Usage: bun bin/svg-to-code.ts <input.svg> [options]

Options:
  --data-part    Convert id attributes to data-part (for DOM usage)
  --fn <name>    Function name (default: generatedSvg)
  -h, --help     Show this help`)
    process.exit(0)
  }

  const inputFile = positionals[0]
  const svgString = await Bun.file(inputFile).text()
  const svgData = extractSvgFromString(svgString)
  const code = generateCode(svgData, {
    dataPart: values['data-part'],
    functionName: values.fn,
  })

  console.log(code)
}
