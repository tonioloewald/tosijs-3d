/*#
# environment

`studioEnvironment(scene)` gives PBR materials something to reflect: a
procedural studio, sky above, a bright horizon and a darker floor below, drawn
on a canvas and turned into the scene's environment texture. No files and
no network.

Without one, a METAL has nothing to reflect and renders nearly black, and
every PBR material loses the image-based light that rounds it out. With it,
chrome shows a sky and a horizon line, gold reads as gold, and a satin's
highlight has something to be bright about. It also lights skin and cloth a
little, so `intensity` stays modest.

```javascript
studioEnvironment(scene, { sky: '#6f8bb0', horizon: '#f2efe8', ground: '#4a4f57' })
```
*/
/*{ "parent": "sky-and-light", "order": 90 }*/
import * as BABYLON from '@babylonjs/core';
/** Draw the studio as an equirectangular image and make it the scene's environment. */
export function studioEnvironment(scene, options = {}) {
    const w = 512;
    const h = 256;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const g = canvas.getContext('2d');
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, options.sky ?? '#6f8bb0');
    grad.addColorStop(0.46, options.horizon ?? '#f2efe8');
    grad.addColorStop(0.5, options.horizon ?? '#f2efe8');
    grad.addColorStop(0.56, options.ground ?? '#4a4f57');
    grad.addColorStop(1, options.ground ?? '#2c3036');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    // Two soft lights high up, so a polished surface has highlights to show.
    for (const [x, y, r] of [
        [0.3, 0.18, 60],
        [0.72, 0.24, 40],
    ]) {
        const l = g.createRadialGradient(x * w, y * h, 0, x * w, y * h, r);
        l.addColorStop(0, 'rgba(255,255,255,0.9)');
        l.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = l;
        g.fillRect(0, 0, w, h);
    }
    const texture = new BABYLON.EquiRectangularCubeTexture(canvas.toDataURL('image/png'), scene, options.size ?? 128);
    scene.environmentTexture = texture;
    scene.environmentIntensity = options.intensity ?? 0.6;
    return texture;
}
//# sourceMappingURL=environment.js.map