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
