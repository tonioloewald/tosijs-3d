/*#
# svg-icons

An **icon proxy** in the style of tosijs-ui's `icons`, over tosijs-3d's own
focused icon set. `svgIcons.<name>()` returns an SVG **`ElementCreator`** — so you
get the full power of the elements factory (props, bindings, event handlers,
children), not just a static blob. Because it's a real element it works both as a
flat DOM node **and** — via `.outerHTML` — as markup rasterized into an in-scene
SVG texture (the VR panels), so one icon set serves both presentations.

## Bringing your own icons

`registerIcons(map)` adds names that **every widget can resolve** — an
`iconGrid3d` item, a `table` icon column, a menu entry, `iconGlyph` directly.
That is the difference from `createSvgIcons(yourData)`, which builds a private
proxy: fine for calling yourself, useless for a name you hand to a control.

```javascript
registerIcons({
  sceneZone: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>',
  sceneMarker: 'star',      // a REDIRECT — alias one of ours into your vocabulary
})
iconGrid3d({ items: [{ icon: 'sceneZone', label: 'zone' }] })
```

A value starting with `<` is artwork; anything else is a redirect to another
name. Registered art gets the composition suffixes for free, so `myArrow90r`
works the moment `myArrow` does.

Registering over an existing name **replaces** it, deliberately and silently —
swapping our `camera` for one that matches your art is a reasonable thing to
want, and a warning on a deliberate act is noise. Nothing is ever removed.

This is the answer to "I have icons I do not want to push upstream": keep them,
register them, and they behave exactly like ours. `isRegisteredIcon(name)` tells
the two apart if you need to.

## Demo

The whole set, plus a few composed variants (rotate / flip / opacity / a
generator redirect). `color` sets `currentColor`, which the stroked glyphs follow
and the baked-color cube ignores.

```js
import { svgIcons, iconNames } from 'tosijs-3d'
import { elements } from 'tosijs'
const { div } = elements

const tile = (name) =>
  div(
    {
      style:
        'display:flex;flex-direction:column;align-items:center;gap:6px;width:88px;color:#dfe6ef;font:12px system-ui',
    },
    svgIcons[name]({ style: { height: '40px', color: '#5fb0ff' } }),
    div(name)
  )

const names = [
  ...iconNames(),
  'arrowUpRight90r', // rotate: ↗ → ↘
  'arrowUpRight0f', // flip H: ↗ → ↖ (a rotation can't produce this)
  'camera50o', // 50% opacity
  'arrowDownRight', // a generator redirect (→ arrowUpRight90r)
]

preview.style.overflow = 'auto'
preview.append(
  div(
    {
      style:
        'display:flex;flex-wrap:wrap;gap:18px;padding:20px;background:#141821;border-radius:12px',
    },
    ...names.map(tile)
  )
)
```

## Composition suffixes

Names carry a **subset** of tosijs-ui's suffix grammar (see [[icon-name]]) — the
pure style modifiers: rotate/flip/scale/translate/opacity/stroke-width/color.
Directional redirects baked in by the icon generator resolve too:

```javascript
svgIcons.arrowUpRight90r() // rotate:  ↗ → ↘
svgIcons.arrowUpRight0f()  // flip H:  ↗ → ↖  (a rotation can't produce this)
svgIcons.arrowDownRight()  // generator redirect → arrowUpRight rotated 90°
svgIcons.camera50o()       // camera at 50% opacity
svgIcons.xrColor()         // the purpose-built "enter XR / VR" mark
```

Not implemented (deliberately): `$` stacking and the `spin`/`un`/`check` overlay
rule-prefixes.

## The set

The artwork lives in `icons/{color,stroked,filled}/*.svg`; `bun run icons`
regenerates [[icon-data]] via tosijs-ui's `tosijs-make-icons` generator (folder
name → default fill/stroke/color handling). Add an SVG, rerun, done. Notable
marks: `tosijs3d` (the brand cube), `xrColor` (the enter-XR/VR affordance, from
tosijs-ui), and `tosiXr`.

## DOM or 3D — svgIcons vs iconGlyph

The same icons two ways, side by side: `svgIcons` in the DOM (left) and
`iconGlyph` baked onto an in-scene SVG **texture** (right). The 3D
grid proves the raster path — `currentColor` doesn't resolve there, so `iconGlyph`
bakes explicit colours (here `#e6e6e6`), while `color` icons keep their palette.
Orbit the plane; they should match the DOM grid.

```js
import { b3d, b3dLight, b3dSvgPlane, svgIcons, iconGlyph, iconNames } from 'tosijs-3d'
import { svgElements, elements } from 'tosijs'

const { svg, rect } = svgElements
const { div } = elements

const names = iconNames().slice(0, 12)
const cols = 4
const cell = 64
const iconPx = 40
const rows = Math.ceil(names.length / cols)
const w = cols * cell
const h = rows * cell

// 3D side: one SVG sheet of iconGlyphs (explicit colours) → plane texture.
const sheet = svg(
  { viewBox: `0 0 ${w} ${h}`, width: w, height: h },
  rect({ x: 0, y: 0, width: w, height: h, fill: '#141821' }),
  ...names.map((n, i) =>
    iconGlyph(n, {
      color: '#e6e6e6',
      size: iconPx,
      x: (i % cols) * cell + (cell - iconPx) / 2,
      y: Math.floor(i / cols) * cell + (cell - iconPx) / 2,
    })
  )
)

const plane = b3dSvgPlane({
  width: 2.4,
  height: (2.4 * h) / w,
  resolution: 512,
  materialChannel: 'emissive',
  pointerEvents: 'off',
})
plane.svgElement = sheet

const scene = b3d(
  {
    // <tosi-b3d> has no intrinsic size — it MUST be given one or it collapses to
    // zero height and the canvas renders blank (a snapshot() still works, since
    // that renders offscreen, so size it explicitly for the on-page view).
    // Cleaves to its container — see the note in box.ts's demo.
    style: 'border-radius:8px;overflow:hidden',
    sceneCreated(el) {
      const cam = new el.BABYLON.ArcRotateCamera(
        'cam', -Math.PI / 2, Math.PI / 2.6, 3.2, el.BABYLON.Vector3.Zero(), el.scene
      )
      el.setActiveCamera(cam)
      cam.attachControl(el.scene.getEngine().getRenderingCanvas(), true)
    },
  },
  b3dLight({ intensity: 1 }),
  plane
)

// DOM side: the same icons via svgIcons.
const domGrid = div(
  {
    style: `display:grid;grid-template-columns:repeat(${cols},${cell}px);background:#141821;color:#e6e6e6`,
  },
  ...names.map((n) =>
    div(
      { style: `display:flex;align-items:center;justify-content:center;height:${cell}px` },
      svgIcons[n]({ style: { height: `${iconPx}px` } })
    )
  )
)

preview.append(
  div(
    { style: 'display:flex;gap:24px;height:100%;padding:16px;background:#0c0e14;box-sizing:border-box' },
    div({ style: 'color:#9ab;font:12px system-ui;display:flex;flex-direction:column;gap:6px;min-width:0' }, 'DOM (svgIcons)', domGrid),
    div({ style: 'color:#9ab;font:12px system-ui;display:flex;flex-direction:column;gap:6px;flex:1;min-width:220px' }, '3D texture (iconGlyph)', scene)
  )
)
```
```css
.preview {
  height: 100%;
}
```
*/
import { w3dTheme } from './w3d-theme.js';
import { elements, svgElements, varDefault } from 'tosijs';
import iconData from './icon-data.js';
import { parseStyleSuffixes, mergeIconStyle, } from './icon-name.js';
export { iconData };
const MAX_REDIRECTS = 10;
// Shown (with a warning) when a name resolves to nothing — a plain square.
const FALLBACK = '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18"/></svg>';
/**
 * Follow redirect chains and strip style suffixes until we reach real SVG markup,
 * accumulating the implied style. Returns `null` if the name resolves to nothing.
 */
function resolveToMarkup(data, name) {
    const style = {};
    let cur = name;
    for (let i = 0; i < MAX_REDIRECTS; i++) {
        /*
        TRIM. The generated `icon-data` stores every value with a trailing space,
        markup and redirects alike — and a redirect is then parsed as a NAME, where
        that space is fatal: `parseStyleSuffixes('cornerUpRight0f ')` returns null
        while the trimmed form returns base `cornerUpRight` + `scaleX(-1)`.
    
        So every MIRRORED icon failed to resolve — which is most of the left-facing
        set, since they are all stored as `<rightVariant>0f`. It looked like the
        icons were missing; they were one space away from working. Reported from
        ensemble as "the icon language isn't working" (tosijs-3d#54).
        */
        /*
        OWN KEYS ONLY — `?.` guards null, not the PROTOTYPE CHAIN.
    
        `data` is a plain object, so `data['constructor']` returns a Function and
        `data['toString']` a method; `?.trim()` then throws
        `TypeError: data[cur]?.trim is not a function` rather than falling back.
        Same for `valueOf`, `hasOwnProperty` and `__proto__`.
    
        Reachable from DATA since 0.8.0: `table` renders an icon column by calling
        `iconGlyph(String(row[c.key]))`, so a row whose cell says "constructor"
        throws inside the body build — and there is no `catch` in the repaint path,
        so scrolling that row into view kills the table, in a VR panel with no
        console. A name is a lookup key, never an instruction.
        */
        const raw = Object.hasOwn(data, cur) ? data[cur] : undefined;
        const entry = typeof raw === 'string' ? raw.trim() : undefined;
        if (entry && entry.startsWith('<'))
            return { spec: entry, style };
        // A trailing suffix run? Peel it off (base may itself be a redirect).
        const parsed = parseStyleSuffixes(cur);
        if (parsed) {
            mergeIconStyle(style, parsed.style);
            cur = parsed.baseName;
            continue;
        }
        // A plain redirect (name → another name).
        if (entry) {
            cur = entry;
            continue;
        }
        return null;
    }
    return null;
}
let iconIdSeq = 0;
/**
 * Build a fresh SVG element from icon markup, merging the caller's element parts
 * and applying the class-driven color model + any composed style. Mirrors the
 * shape of tosijs-ui's `makeIcon` (id-uniquify, class-based fill/stroke, size via
 * the shared `--tosi-icon-*` vars) so our icons theme alongside tosijs-ui's.
 */
function buildSvgIcon(spec, parts, style) {
    const holder = elements.div();
    holder.innerHTML = spec;
    const source = holder.querySelector('svg');
    // Uniquify any internal ids (clipPath/mask/gradient) so repeated instances
    // don't collide. Generated data is id-free, so this is defensive.
    const idEls = source.querySelectorAll('[id]');
    if (idEls.length > 0) {
        const idMap = new Map();
        for (const el of idEls) {
            const newId = `b3d_icon_${++iconIdSeq}`;
            idMap.set(el.id, newId);
            el.id = newId;
        }
        let inner = source.innerHTML;
        for (const [oldId, newId] of idMap) {
            const esc = oldId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            inner = inner
                .replace(new RegExp(`url\\(#${esc}\\)`, 'g'), `url(#${newId})`)
                .replace(new RegExp(`href="#${esc}"`, 'g'), `href="#${newId}"`);
        }
        source.innerHTML = inner;
    }
    const classes = new Set(source.classList);
    classes.add('tosi-icon');
    const svg = svgElements.svg({
        class: Array.from(classes).join(' '),
        viewBox: source.getAttribute('viewBox') ?? '0 0 24 24',
    }, ...parts, ...Array.from(source.children));
    // Class-driven defaults, but only where the caller (via `parts`) hasn't already
    // set the property — so an inline `style` in the creator call wins, giving the
    // element-creator its full expected power.
    if (!svg.style.height)
        svg.style.height = varDefault.tosiIconSize('1em');
    if (classes.has('color')) {
        // `color` icons (incl. `color filled`, e.g. xrColor) keep their baked-in
        // per-path fills/strokes — impose no currentColor tint.
    }
    else if (classes.has('filled')) {
        if (!svg.style.stroke)
            svg.style.stroke = 'none';
        if (!svg.style.fill)
            svg.style.fill = 'currentColor';
    }
    else if (classes.has('stroked')) {
        if (!svg.style.stroke)
            svg.style.stroke = varDefault.tosiIconStroke('currentColor');
        if (!svg.style.fill)
            svg.style.fill = varDefault.tosiIconFill('none');
        if (!svg.style.strokeWidth)
            svg.style.strokeWidth = varDefault.tosiIconStrokeWidth('2px');
    }
    else {
        // Untyped icon: monochrome, follows currentColor.
        if (!svg.style.stroke)
            svg.style.stroke = varDefault.tosiIconStroke('currentColor');
        if (!svg.style.fill)
            svg.style.fill = varDefault.tosiIconFill('currentColor');
    }
    // Composition-suffix styles (from the name) are applied last, so `chevron_f00S`
    // overrides the class default stroke.
    if (style)
        Object.assign(svg.style, style);
    return svg;
}
/**
 * Hand-authored redirects layered on top of the generated set — for aliases the
 * icon generator can't express (a rotated/flipped variant under a different
 * name). They're ordinary redirect entries, so they compose with suffixes just
 * like the generator's own directional redirects, and they survive
 * `bun run icons` (which only rewrites {@link icon-data}).
 */
export const iconAliases = {
    moreHorizontal: 'moreVertical90r',
};
/**
 * Build an icon proxy over a specific icon-data map. The default {@link svgIcons}
 * binds this to tosijs-3d's generated set; pass your own map to make an
 * independent proxy (this is also how the tests exercise it with a fixture).
 * `aliases` are merged UNDER the data (real icons win any name clash).
 */
export function createSvgIcons(data = iconData, aliases = iconAliases) {
    /*
    Hold the LIVE object when there is nothing to merge, rather than a snapshot.
  
    A copy is right for a private set built from fixed data, and wrong for the
    default instance: `registerIcons` mutates the default map, and a proxy over a
    copy would resolve everything except the icons a consumer just added.
    */
    const map = Object.keys(aliases).length === 0 ? data : { ...aliases, ...data };
    return new Proxy({}, {
        get(_t, prop) {
            return (...parts) => {
                const resolved = resolveToMarkup(map, prop);
                if (!resolved) {
                    warnOnce(`svgIcons: unknown icon "${prop}"`);
                    return buildSvgIcon(FALLBACK, parts);
                }
                return buildSvgIcon(resolved.spec, parts, resolved.style);
            };
        },
        has(_t, prop) {
            return typeof prop === 'string' && resolveToMarkup(map, prop) !== null;
        },
    });
}
/** Names of the icons with real artwork (excludes pure redirect entries). */
export function iconNames(data = DEFAULT_MAP) {
    return Object.keys(data).filter((name) => {
        // `Object.keys` is own-keys already; the type guard is for a map built by
        // a consumer whose values are not all strings.
        const v = data[name];
        return typeof v === 'string' && v.startsWith('<');
    });
}
/*
The default resolution map: generated icon-data with aliases layered under it,
plus whatever a consumer has registered.

MUTABLE on purpose. Every widget that draws an icon — `table`'s icon column,
`iconGrid3d`, the keyboard, a menu item — resolves a NAME through here, so an
icon set a consumer cannot add to is one their widgets cannot use. They could
always build a private proxy with `createSvgIcons(theirData)`, but that only
serves direct calls; it does nothing for a name handed to a control.
*/
const DEFAULT_MAP = {
    ...iconAliases,
    ...iconData,
};
/**
 * Add icons a consumer owns, so the widgets can resolve them by name.
 *
 * ```js
 * registerIcons({
 *   sceneZone: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>',
 *   sceneMarker: 'mapPin',   // a REDIRECT: an alias for an icon that exists
 * })
 * iconGrid3d({ items: [{ icon: 'sceneZone', label: 'zone' }] })
 * ```
 *
 * A value starting with `<` is artwork; anything else is a redirect to another
 * name, which is how the built-in mirrors work and how you alias one of ours to
 * a name from your own vocabulary.
 *
 * **Registering over an existing name replaces it**, deliberately and without a
 * warning: swapping our `camera` for one that matches your art is a reasonable
 * thing to want, and a warning on a deliberate act is noise. Nothing is
 * removed, so a name you did not register still resolves.
 *
 * Values are TRIMMED, because `icon-data` stores every entry with a trailing
 * space and a redirect is re-parsed as a name where that space is fatal — it
 * silently broke every mirrored icon once already (#54).
 */
export function registerIcons(icons) {
    for (const [name, value] of Object.entries(icons)) {
        if (typeof value !== 'string' || value.trim() === '')
            continue;
        /*
        `__proto__` is an ASSIGNMENT, not a key — it would set the map's prototype
        instead of storing an icon, corrupting every later lookup rather than
        failing. Define the property instead, so a hostile name is stored as data
        like any other.
        */
        Object.defineProperty(DEFAULT_MAP, name, {
            value: value.trim(),
            writable: true,
            enumerable: true,
            configurable: true,
        });
    }
}
/** Is this a name a consumer registered, rather than one we shipped? */
export function isRegisteredIcon(name) {
    return (name in DEFAULT_MAP &&
        !(name in iconAliases) &&
        !(name in iconData));
}
/**
 * A **texture-safe** icon: an `svgElements` `<g>` with EXPLICIT colours baked in
 * (no `currentColor` / CSS vars), scaled and positioned for embedding directly in
 * a [[widgets3d]] SVG tree. Those trees rasterize to a Babylon texture in VR,
 * where `currentColor` and custom properties DON'T resolve — so use this, not
 * {@link svgIcons}, for in-scene / in-panel glyphs.
 *
 * `color` icons keep their baked palette; `stroked`/`filled` icons are tinted to
 * `color`. Base names only — composition suffixes (rotate/flip/…) stay DOM-only
 * on {@link svgIcons}; passing one here warns rather than silently mis-rendering.
 */
/*
ONE WARNING PER PROBLEM, not per draw.

These fire from DRAWING code — `iconGlyph` runs on every repaint of a keyboard,
an icon grid or a panel, so a single wrong name produced dozens of identical
lines a second and buried everything else in the console. The name is the whole
message, so the second copy carries no information the first did not.

Keyed by the full text rather than the icon name, so the "unknown icon" and
"composition suffix" cases for the same name still both get said once.
*/
const warned = new Set();
function warnOnce(message) {
    if (warned.has(message))
        return;
    warned.add(message);
    console.warn(message);
}
/**
 * Can this name be drawn?
 *
 * Asks the same resolver the drawing code uses, so it answers for the whole icon
 * LANGUAGE — a plain name, a composed one (`chevron270r`), or a mirror reference
 * (`cornerDownLeft`, stored as `cornerDownRight0f`) all answer honestly.
 *
 * Exists because the alternative is guessing: checking `name in iconData` says
 * no for every composed name, and inspecting the stored value says no for every
 * mirror. Both were doing exactly that here, and both were wrong once mirrors
 * started resolving.
 */
export function iconExists(name) {
    return resolveToMarkup(DEFAULT_MAP, name) !== null;
}
export function iconGlyph(name, opts = {}) {
    /*
    Stroke width comes from the THEME by default.
  
    It was hardcoded to 2, so `w3dTheme.strokeWidth` reached nothing but the text
    caret — a themed panel could not make its icons match its own line weight.
    Tonio: "it should be impacted by strokeWidth -- the only thing currently
    impacted is the text caret."
  
    An explicit option still wins, since an icon used as a mark rather than as UI
    chrome may want its own weight.
    */
    const { color = '#000', size = 24, x = 0, y = 0, strokeWidth = w3dTheme.strokeWidth, } = opts;
    const resolved = resolveToMarkup(DEFAULT_MAP, name);
    if (!resolved)
        warnOnce(`iconGlyph: unknown icon "${name}"`);
    const holder = elements.div();
    // `currentColor` doesn't resolve in a rasterized texture, so bake it to `color`
    // up front. Harmless for hex-coloured multicolour icons; it's what lets a
    // `color` icon that's actually monochrome-via-currentColor (e.g. keyboard) tint.
    holder.innerHTML = (resolved?.spec ?? FALLBACK).replace(/currentColor/g, color);
    const src = holder.querySelector('svg');
    const vb = (src.getAttribute('viewBox') ?? '0 0 24 24')
        .split(/[\s,]+/)
        .map(Number);
    const scale = size / Math.max(vb[2] || 24, vb[3] || 24);
    const classes = new Set(src.classList);
    /*
    APPLY THE COMPOSED TRANSFORM, rather than warning that we cannot.
  
    `resolveToMarkup` already returns the style a composed name implies —
    `chevron90r` gives `rotate(90deg)`, `cornerUpLeft` redirects to
    `cornerUpRight0f` and gives `scaleX(-1)`. This threw that away and told the
    caller to use a base name, which for a MIRROR meant the glyph did not exist in
    any usable form: every left-facing arrow was unreachable on the texture path.
  
    The style is CSS (that is what the DOM path consumes), so it is translated to
    an SVG transform here. About the icon's own centre in its own viewBox units,
    so it composes with the translate+scale above rather than fighting it.
    */
    const cx = (vb[2] || 24) / 2;
    const cy = (vb[3] || 24) / 2;
    const composed = [];
    const css = resolved?.style.transform ?? '';
    for (const m of css.matchAll(/rotate\(\s*(-?[\d.]+)deg\s*\)/g)) {
        composed.push(`rotate(${m[1]} ${cx} ${cy})`);
    }
    if (/scaleX\(\s*-1\s*\)/.test(css)) {
        composed.push(`translate(${cx * 2} 0) scale(-1 1)`);
    }
    if (/scaleY\(\s*-1\s*\)/.test(css)) {
        composed.push(`translate(0 ${cy * 2}) scale(1 -1)`);
    }
    const g = svgElements.g({
        transform: `translate(${x} ${y}) scale(${scale})${composed.length ? ' ' + composed.join(' ') : ''}`,
    }, ...Array.from(src.children));
    if (classes.has('color')) {
        // baked per-path colours — leave them
    }
    else if (classes.has('filled')) {
        g.setAttribute('fill', color);
        g.setAttribute('stroke', 'none');
    }
    else {
        g.setAttribute('fill', 'none');
        g.setAttribute('stroke', color);
        g.setAttribute('stroke-width', String(strokeWidth));
        g.setAttribute('stroke-linecap', 'round');
        g.setAttribute('stroke-linejoin', 'round');
    }
    return g;
}
/** The default icon proxy, over tosijs-3d's generated icon set. */
/*
Built against the LIVE default map, not a snapshot — so an icon registered
after this module loads is still reachable as `svgIcons.myIcon`. `createSvgIcons`
copies its arguments, which is right for a private set and wrong for this one.
*/
export const svgIcons = createSvgIcons(DEFAULT_MAP, {});
/*{ "parent": "UI", "order": 230 }*/
//# sourceMappingURL=svg-icons.js.map