/*#
# asset-url

A tiny indirection for referencing hosted blobs (models, textures, audio, …) by a
LOGICAL path, so demos/consumers aren't littered with a hostname and can retarget the
host in one place. `assetUrl('kenney/vehicles/car.glb')` resolves against a base set
once via `setAssetBase(...)`; the base defaults to empty, so paths resolve locally
(served from `static/`) for tests and offline dev. Already-absolute URLs
(`http(s)://`, `data:`, `blob:`) pass through untouched.

```js
import { setAssetBase, assetUrl, b3dLoader } from 'tosijs-3d'

setAssetBase('https://static.tosijs.net')          // once, e.g. in demo/site.ts
b3dLoader({ url: assetUrl('kenney/vehicles/car.glb') })
```
*/
/*{ "parent": "Core" }*/

let base = ''

/** Set the base URL prepended to logical asset paths (e.g. `https://static.tosijs.net`). */
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
export function assetUrl(path: string): string {
  if (/^(https?:)?\/\//i.test(path) || /^(data|blob):/i.test(path)) return path
  return `${base}/${path.replace(/^\/+/, '')}`
}
