// Hydration bundle entry — loaded by every generated /{slug}/index.html.
// Registers the doc-system and seeds it with the modules live examples may
// `import`, so an inline `import { b3dAircraft } from 'tosijs-3d'` resolves.

import 'tosijs-ui' // registers <tosi-doc-system> and the tosi-* element family
import * as tosijs from 'tosijs'
import * as tosijs3d from '../src/index'
import * as tosijsui from 'tosijs-ui'
import * as demoUtils from './demo-utils' // shared "when in doubt" helpers for live examples

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
