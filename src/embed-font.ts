/*#
# embed-font

**Make a web font survive rasterisation.** Fetch a font file, base64 it, and
hand back an `@font-face` rule that can travel *inside* a serialised SVG.

## The problem it solves

A face the document has loaded is not available to an SVG that has been
serialised and drawn through an `Image` — the browser treats that as its own
document, so it inherits neither the page's font faces nor its CSS custom
properties. The second half is why [[w3d-theme]] bakes literals; this is the
first half.

The symptom is quiet and easy to misread: an in-scene panel renders in the
fallback family while the identical flat panel renders correctly. Found exactly
that way, with the two side by side on the [[w3d-theme]] demo — Rosario flat,
serif in the scene.

## Why base64 rather than a URL

An `@font-face` with a `url()` is a *reference*, and a reference is the thing
the serialised document cannot follow: it has no base URL, and even
same-origin it is fetched in a context that may not be allowed to. Encoding the
bytes into the rule makes the SVG **self-contained**, which is the same
property that makes the whole texture path work at all.

## The costs, stated plainly

A woff2 is typically 20–100 KB and base64 adds a third. That payload is
re-parsed on every rasterisation unless the caller caches — which is why
`fontFaceCss` caches per URL, and why callers should register a family once
rather than per panel.

Subsetting to the glyphs actually drawn would cut this hard, and is not done
here: it needs a shaper, which is a far larger dependency than the feature
warrants today.
*/
/*{ "parent": "UI" }*/

/** A resolved face, ready to inline. */
export interface EmbeddedFont {
  family: string
  /** A complete `@font-face` rule with the payload inlined. */
  css: string
  /** Encoded size in bytes — worth logging before shipping a large face. */
  bytes: number
}

const cache = new Map<string, Promise<EmbeddedFont>>()

/** MIME type from the extension, since the rule needs it and the server may not say. */
function mimeFor(url: string): string {
  if (/\.woff2(\?|$)/i.test(url)) return 'font/woff2'
  if (/\.woff(\?|$)/i.test(url)) return 'font/woff'
  if (/\.otf(\?|$)/i.test(url)) return 'font/otf'
  return 'font/ttf'
}

/** Base64 without blowing the stack on a 100 KB file. */
export function base64OfBytes(bytes: Uint8Array): string {
  let binary = ''
  // Chunked: `String.fromCharCode(...bytes)` spreads every byte as an argument
  // and throws RangeError somewhere around 100k on a real font.
  const CHUNK = 0x8000
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  }
  return btoa(binary)
}

/**
 * Build the `@font-face` rule for a font file, caching per URL.
 *
 * `weight` and `style` are passed through rather than guessed: a face fetched
 * as "the bold one" must say so, or the browser synthesises a bold from it and
 * you get double-emboldening.
 */
export async function fontFaceCss(
  family: string,
  url: string,
  opts: { weight?: string; style?: string } = {}
): Promise<EmbeddedFont> {
  const key = `${family}|${url}|${opts.weight ?? ''}|${opts.style ?? ''}`
  const hit = cache.get(key)
  if (hit != null) return hit
  const task = (async (): Promise<EmbeddedFont> => {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`embed-font: ${url} → ${res.status}`)
    const bytes = new Uint8Array(await res.arrayBuffer())
    const b64 = base64OfBytes(bytes)
    const css =
      `@font-face{font-family:'${family}';` +
      `src:url(data:${mimeFor(url)};base64,${b64}) format('${
        mimeFor(url).split('/')[1]
      }');` +
      `font-weight:${opts.weight ?? 'normal'};font-style:${
        opts.style ?? 'normal'
      };}`
    return { family, css, bytes: b64.length }
  })()
  cache.set(key, task)
  // A failed fetch must not be remembered as the answer — otherwise one flaky
  // load disables the font for the life of the page.
  task.catch(() => cache.delete(key))
  return task
}

/** Registered faces, injected into every serialised SVG. */
const registered = new Map<string, EmbeddedFont>()

/**
 * Register a face so in-scene panels can render it.
 *
 * ```js
 * await registerSvgFont('Rosario', '/fonts/rosario.woff2')
 * setW3dTheme({ fontFamily: 'Rosario, serif' })
 * ```
 *
 * Resolves once the bytes are in hand; panels rasterised before that render the
 * fallback, which is why this is awaited rather than fired and forgotten.
 */
export async function registerSvgFont(
  family: string,
  url: string,
  opts: { weight?: string; style?: string } = {}
): Promise<EmbeddedFont> {
  const font = await fontFaceCss(family, url, opts)
  registered.set(`${family}|${opts.weight ?? ''}|${opts.style ?? ''}`, font)
  return font
}

/** Forget a registered face. */
export function unregisterSvgFont(family: string): void {
  for (const key of [...registered.keys()]) {
    if (key.split('|')[0] === family) registered.delete(key)
  }
}

/**
 * The `<style>` block to inject, or `''` when nothing is registered.
 *
 * Returns only the faces the markup actually **mentions**. A panel in one
 * family should not carry the bytes of three others — and since the payload is
 * re-parsed per rasterisation, that is the difference between one font and
 * every font on every texture.
 */
export function svgFontStyle(markup: string): string {
  if (registered.size === 0) return ''
  const used = [...registered.values()].filter((f) => markup.includes(f.family))
  if (used.length === 0) return ''
  // Dedupe by rule: two weights of one family are separate faces, but the same
  // face registered twice should not be inlined twice.
  const css = [...new Set(used.map((f) => f.css))].join('')
  return `<style>${css}</style>`
}
