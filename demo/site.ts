// Hydration bundle entry — loaded by every generated /{slug}/index.html.
// Registers the doc-system and seeds it with the modules live examples may
// `import`, so an inline `import { b3dAircraft } from 'tosijs-3d'` resolves.

import 'tosijs-ui' // the tosi-* element family
// Since tosijs-ui 1.15 the barrel NO LONGER registers the doc-authoring
// elements — they are opt-in subpaths. Without these two the site renders its
// prerendered markup and nothing else (no nav, no live examples, no console
// error). Caught by the 0.8.4 publish dry run's build warning.
import 'tosijs-ui/doc-browser'
import 'tosijs-ui/live-example'
import * as tosijs from 'tosijs'
import * as tosijs3d from '../src/index'
import * as tosijsui from 'tosijs-ui'
import * as demoUtils from './demo-utils' // shared "when in doubt" helpers for live examples
/*
SHADOW SHADERS, STATICALLY. Babylon's ShadowGenerator loads these with a
dynamic import(); in the site's code-split ESM build each lands in a chunk
that imports "../hydrate.js" while the page loaded "hydrate.js?v=<hash>" —
two URLs, so a SECOND copy of the whole bundle evaluates, throws "Cannot
redefine property: onBeforeViewRenderObservable", the import rejects, and
no shadow map ever renders on the doc site (sun shadows included). Found
chasing lightning shadows (tosijs-ui#191 is the root). Imported here they
are registered in THIS copy of Babylon's ShaderStore; and since Bun still
emits the chunk import, the loader is told they are here rather than
fetching the chunk that brings the second copy in. GLSL only (the site is
WebGL). Remove once tosijs-ui#191 lands.
*/
import '@babylonjs/core/Shaders/shadowMap.fragment.js'
import '@babylonjs/core/Shaders/shadowMap.vertex.js'
import '@babylonjs/core/Shaders/depthBoxBlur.fragment.js'
import '@babylonjs/core/Shaders/ShadersInclude/shadowMapFragmentSoftTransparentShadow.js'
import { ShadowGenerator } from '@babylonjs/core'
;(ShadowGenerator.prototype as any)._initShaderSourceAsync = async function (
  this: any
) {
  this._shaderLanguage = 0 // GLSL
  this._shadersLoaded = true
}

// Point live examples' asset lookups (assetUrl) at the shared CDN.
tosijs3d.setAssetBase('https://cdn.tosijs.net')

// Show the 📊 perf/debug toggle on every live demo across the doc site (each
// scene's own toolbar). A dev/authoring affordance — library consumers don't get
// it unless they opt in per scene (`stats`) or via `#perf`.
tosijs3d.showB3dStats()

// <tosi-doc-system> only reads .context inside render(), which awaits the
// docs.json fetch its connectedCallback kicks off — so a synchronous assignment
// here, right after the imports register the element, lands well in time.
for (const el of document.querySelectorAll('tosi-doc-system')) {
  ;(el as any).context = {
    tosijs,
    'tosijs-3d': tosijs3d,
    'tosijs-ui': tosijsui,
    // The PUBLISHED specifier, so a snippet copied off a page resolves in a
    // consumer's project unchanged. `demo-utils` stays registered for the
    // handful of examples that use the site-only helpers (volumetricDemo,
    // impactMarker, the asset constants).
    'tosijs-3d/demo-utils': demoUtils,
    'demo-utils': demoUtils,
  }
}
