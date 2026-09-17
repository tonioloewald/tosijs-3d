/*#
# asset-url

A tiny indirection for referencing hosted blobs (models, textures, audio, …) by a
LOGICAL path, so demos/consumers aren't littered with a hostname and can retarget the
host in one place. `assetUrl('kenney/vehicles/car.glb')` resolves against a base set
once via `setAssetBase(...)`; the base defaults to empty, so paths resolve locally
(served from `static/`) for tests and offline dev. Already-absolute URLs
(`http(s)://`, `data:`, `blob:`) pass through untouched.

```javascript
import { setAssetBase, assetUrl, b3dLoader } from 'tosijs-3d'

setAssetBase('https://cdn.tosijs.net')          // once, e.g. in demo/site.ts
b3dLoader({ url: assetUrl('kenney/vehicles/car.glb') })
```
*/
/*{ "parent": "Core", "order": 900 }*/

let base = ''

/** Set the base URL prepended to logical asset paths (e.g. `https://cdn.tosijs.net`). */
export function setAssetBase(url: string): void {
  base = url.replace(/\/+$/, '')
}

/** The current asset base (`''` = resolve locally). */
export function getAssetBase(): string {
  return base
}

/**
 * Resolve a logical asset path against the base. Absolute URLs (`http(s)://`,
 * `data:`, `blob:`) pass through unchanged.
 */
/**
 * A version tag is how you survive an asset being REPUBLISHED in place.
 *
 * The CDN serves `Cache-Control: public, max-age=31536000, immutable`, which is
 * right for asset bytes and unforgiving when a file changes under its own URL:
 * a browser that fetched the old one keeps it for a year, and nothing about the
 * page looks stale.
 *
 * ⚠️ AND "DISABLE CACHE" IS NOT ENOUGH — measured, in a browser running with
 * DevTools caching off, against `quaternius/UAL1_core.glb` after animation
 * clips were added to it:
 *
 * | request | bytes |
 * | --- | --- |
 * | plain `fetch(url)` | 6,005,360 — stale, and not even the version before |
 * | `fetch(url + '?v=…')` | 6,581,976 — current |
 * | `fetch(url, {cache:'reload'})` | 6,581,976 — current |
 *
 * The symptom was a character whose weapon appeared in his hand and who then
 * would not change pose, because the clips the pose needs were not in the copy
 * he had. Three wrong diagnoses before someone looked at the actual bytes.
 *
 * So pass a version whenever you depend on content that has been republished:
 * `assetUrl('quaternius/UAL1_core.glb', 2)`. It changes the URL, which is the
 * only thing an immutable cache respects.
 */
export function assetUrl(path: string, version?: string | number): string {
  if (/^(https?:)?\/\//i.test(path) || /^(data|blob):/i.test(path)) return path
  const url = `${base}/${path.replace(/^\/+/, '')}`
  return version == null || version === '' ? url : `${url}?v=${version}`
}
