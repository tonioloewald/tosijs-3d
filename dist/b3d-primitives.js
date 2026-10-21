/*#
# Primitives: box, sphere, ground

**A box, a sphere and a ground plane, as elements.** The quickest way to put
something in a scene: no model file, a material already on it, and it casts
and receives shadows without being asked. Nearly every demo on this site
starts with these.

## Demo

```js
import { b3d, b3dSun, b3dSkybox, b3dGround, b3dBox, b3dSphere } from 'tosijs-3d'

preview.append(
  b3d(
    { glowLayerIntensity: 0.6 },
    b3dSun(),
    b3dSkybox({ timeOfDay: 10 }),
    b3dGround({ size: 24, texture: 'checker', textureTiles: 12 }),
    b3dBox({ x: -2, y: 0.75, size: 1.5, color: '#c8553d' }),
    b3dBox({ x: 0, y: 0.25, z: 2, width: 3, height: 0.5, depth: 1, color: '#588b8b', solid: 'on' }),
    b3dSphere({ x: 2, y: 1, diameter: 2, color: '#ffd166', glow: 0.4 }),
    b3dSphere({ z: -3, y: 1, diameter: 2, mirror: true })
  )
)
```
```css
tosi-b3d { width: 100%; height: 100%; }
```

Position and rotation are the attributes every mesh element has: `x`, `y`,
`z`, and `rx`, `ry`, `rz` in degrees.

## `b3dBox`

| Attribute | Default | |
| --- | --- | --- |
| `meshName` | `'box'` | The Babylon mesh's name (what `scene.getMeshByName` and naming suffixes such as `_nocast` see) |
| `size` | `1` | Edge length of a cube |
| `width` / `height` / `depth` | `0` | Set any of them to make it a slab or a post; `0` uses `size` |
| `color` | `'#ff0000'` | |
| `glow` | `0` | Self-illumination, 0 to 1, as a fraction of `color`. Blooms if the scene has `glowLayerIntensity` |
| `glowColor` | `''` | A different colour for the glow |
| `mirror` | `false` | Polished metal that reflects the scene (see [[b3d-reflections]]) |
| `solid` | `'off'` | `'on'`: a character walks into it instead of through it |

## `b3dSphere`

The same, with `diameter` (`1`) and `segments` (`16`) in place of the box's
dimensions, and `meshName` defaulting to `'sphere'`.

## `b3dGround`

| Attribute | Default | |
| --- | --- | --- |
| `meshName` | `'ground'` | The Babylon mesh's name (`'ground_nocast'` keeps it from casting shadows) |
| `size` | `0` | A square of this side; overrides `width` and `height` |
| `width` / `height` | `4` | |
| `color` | `'#888888'` | |
| `texture` | `''` | An image URL, or `'checker'` (a ruler you can count) or `'noise'` (mottled natural ground) |
| `textureTiles` | `8` | Repeats across the plane; for `'noise'`, the number of features |
| `holes` (JS) | `null` | Rectangles `{ x, z, width, depth }` cut out of it, for a pool or a pit; the texture runs on unbroken around them. Whole-metre edges |

A ground is always solid. Boxes and spheres are scenery unless you say
`solid: 'on'`, because a decorative box that quietly starts blocking a doorway
is a worse surprise than one you have to ask for. A solid under about half a
metre tall gets an invisible taller collider automatically, since character
collision does not notice anything shorter (`solidProxy: 'off'` declines it).

For shapes beyond these three, `el.make.*` builds any Babylon primitive with
the same conveniences: see [[make-mesh]]. For a model file, [[b3d-loader]].
*/
/*{ "parent": "core", "order": 30 }*/
import * as BABYLON from '@babylonjs/core';
import { AbstractMesh, fetchedUrl, isOff } from './b3d-utils.js';
import { PerlinNoise } from './perlin-noise.js';
/**
 * The shortest collider Babylon's swept ellipsoid reliably notices.
 *
 * Measured against the biped's own ellipsoid (radii 0.3/0.75/0.3, offset 1.1)
 * by walking it into boxes through the real input path: 0.2 and 0.4 tall are
 * walked through, 0.6 and 0.8 stop it at the face plus the ellipsoid radius.
 * 0.6 with a little margin.
 */
const MIN_SOLID_HEIGHT = 0.7;
/**
 * Give a short solid mesh an invisible box to collide with.
 *
 * Returns the proxy, or `null` when the mesh is already tall enough to be
 * noticed on its own. See the long note on `solid`.
 */
function addSolidProxy(mesh, scene) {
    const box = mesh.getBoundingInfo().boundingBox;
    const size = box.maximum.subtract(box.minimum);
    if (size.y >= MIN_SOLID_HEIGHT)
        return null;
    const proxy = BABYLON.MeshBuilder.CreateBox(`${mesh.name}-collider`, {
        width: Math.max(0.02, size.x),
        height: MIN_SOLID_HEIGHT,
        depth: Math.max(0.02, size.z),
    }, scene);
    // Centred on the real thing, in ITS space, so it follows any transform.
    const centre = box.minimum.add(box.maximum).scale(0.5);
    proxy.parent = mesh;
    proxy.position.copyFrom(centre);
    proxy.rotationQuaternion = null;
    proxy.rotation.set(0, 0, 0);
    proxy.checkCollisions = true;
    proxy.isVisible = false;
    /*
    NOT PICKABLE, which is the whole point — see `solid`. Projectiles, the ground
    probe and the cover queries all raycast against pickable meshes, so keeping it
    out of that set is what lets a handrail stop a body and still let a shot
    through the gap beneath it.
    */
    proxy.isPickable = false;
    proxy.doNotSyncBoundingInfo = true;
    return proxy;
}
/**
 * A 2×2 checker drawn to a DynamicTexture — no external asset, tiles via
 * uScale/vScale (it must WRAP, see below). The dark squares are the light ones at 70%: a fixed second
 * grey (it was #767676) all but vanished against the default #888 ground.
 * Mipmapped and anisotropic, or a tiled checker shimmers into moiré bands
 * toward the horizon.
 */
function makeCheckerTexture(name, scene, color = '#9a9a9a') {
    const size = 128;
    const tex = new BABYLON.DynamicTexture(name, { width: size, height: size }, scene, true, BABYLON.Texture.TRILINEAR_SAMPLINGMODE);
    tex.anisotropicFilteringLevel = 8;
    // A DynamicTexture CLAMPS by default, so with uScale above 1 every tile past
    // the first was its edge colour: one flat grey, no checker at all.
    tex.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE;
    tex.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;
    const ctx = tex.getContext();
    const half = size / 2;
    const light = BABYLON.Color3.FromHexString(color);
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = light.scale(0.7).toHexString();
    ctx.fillRect(0, 0, half, half);
    ctx.fillRect(half, half, half, half);
    tex.update();
    return tex;
}
/**
 * A soft mottled ground, drawn ONCE at the size of the whole plane.
 *
 * The checker it replaces was legible but ugly, and the ugliness is structural:
 * a tiled pattern on a large ground announces its own period, so the eye reads
 * the repeat rather than the surface. This is drawn at `uScale = 1` — one
 * texture across the entire plane — so there IS no period to see, at the cost
 * of a texture that must be generated rather than looked up.
 *
 * fBm rather than noise: a single octave is a blur, and it is the octaves that
 * make it read as ground with things going on in it at several scales. The
 * variation is in VALUE only, around the mesh's own `color`, because a ground
 * that shifts hue reads as a material change — moss, or mud — which is a claim
 * a flat-shaded plane cannot support.
 */
function makeNoiseTexture(name, scene, color, features, size = 512) {
    const tex = new BABYLON.DynamicTexture(name, { width: size, height: size }, scene, true);
    const ctx = tex.getContext();
    const img = ctx.createImageData(size, size);
    const base = BABYLON.Color3.FromHexString(color);
    const noise = new PerlinNoise(1337);
    const f = Math.max(1, features) / size;
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            // Two scales, deliberately: a broad one that gives the ground shape, and
            // a fine one that keeps it from looking like a gradient up close.
            const broad = noise.fractal(x * f, y * f, 0, 4);
            const fine = noise.fractal(x * f * 7, y * f * 7, 11, 2);
            const v = 1 + broad * 0.42 + fine * 0.12;
            const i = (y * size + x) * 4;
            img.data[i] = Math.max(0, Math.min(255, base.r * 255 * v));
            img.data[i + 1] = Math.max(0, Math.min(255, base.g * 255 * v));
            img.data[i + 2] = Math.max(0, Math.min(255, base.b * 255 * v));
            img.data[i + 3] = 255;
        }
    }
    ctx.putImageData(img, 0, 0);
    tex.update();
    return tex;
}
/**
 * The material a primitive gets, from its attributes.
 *
 * `mirror` picks a polished PBR metal, everything else a StandardMaterial —
 * and either way `glow` applies. This was written out twice, identically, in
 * B3dSphere and B3dBox, which is how the sphere came to be missing `glow`
 * about ninety seconds after the box got it: the same code in two places
 * disagrees the first time you touch one of them.
 *
 * On glow: `emissiveColor` is what it means to a StandardMaterial — colour
 * added regardless of the lighting, so the surface reads as lit from within
 * rather than merely pale. The parent's `glowLayerIntensity` is what makes it
 * BLEED past the silhouette; the two are separate, and a glow with no glow
 * layer is a common "why isn't this glowing" (it is, it just isn't blooming).
 */
export const primitiveMaterial = (meshName, scene, attrs) => {
    if (attrs.mirror) {
        const material = new BABYLON.PBRMaterial(meshName + '-mat', scene);
        material.albedoColor = BABYLON.Color3.FromHexString(attrs.color);
        material.metallic = 1;
        material.roughness = 0.05;
        return material;
    }
    const material = new BABYLON.StandardMaterial(meshName + '-mat', scene);
    material.diffuseColor = BABYLON.Color3.FromHexString(attrs.color);
    const g = Math.max(0, Math.min(1, attrs.glow ?? 0));
    if (g > 0) {
        material.emissiveColor = BABYLON.Color3.FromHexString(attrs.glowColor || attrs.color).scale(g);
    }
    return material;
};
export class B3dSphere extends AbstractMesh {
    static preferredTagName = 'tosi-b3d-sphere';
    static initAttributes = {
        ...AbstractMesh.initAttributes,
        meshName: 'sphere',
        segments: 16,
        diameter: 1,
        color: '#ff0000',
        /**
         * Self-illumination, 0..1, as a fraction of `color` — `0.3` is a lit-from-
         * within look, `1` is a lamp. Needs `glowLayerIntensity` on the parent
         * `<tosi-b3d>` for the BLOOM; without it the surface still brightens, it
         * just doesn't bleed past its edges.
         *
         * `glowColor` overrides the hue, so a dull red box can throw yellow light.
         */
        glow: 0,
        glowColor: '',
        mirror: false,
        /**
         * `'on'` makes it SOLID — a character walks into it instead of through it.
         *
         * Off by default because most primitives in most scenes are scenery, and a
         * decorative box that silently starts blocking a doorway is a worse
         * surprise than one you have to ask to be solid. A `b3dGround` is always
         * solid; it is the one primitive nobody wants to fall through.
         *
         * A SHORT SOLID GETS AN INVISIBLE COLLISION PROXY, automatically.
         *
         * Babylon's character collision sweeps an ellipsoid, and it misses a
         * collider much under half a metre tall: measured against the biped, a bar
         * 0.2m or 0.4m tall is walked straight through, 0.6m and up stops it dead.
         * Height is the variable — a bar floating well clear of the floor stops a
         * character perfectly well if it is tall enough, and a bar resting ON the
         * floor does not if it is not.
         *
         * So anything solid and shorter than `MIN_SOLID_HEIGHT` gets a hidden box
         * of that height, centred on it, doing the colliding.
         *
         * ⚠️ THE PROXY IS NOT PICKABLE, and that is the point rather than an
         * implementation detail. Character collision reads `checkCollisions`;
         * projectiles, the ground probe and every cover query raycast against
         * PICKABLE meshes. Keeping the proxy out of the second set means a handrail
         * stops you walking off a catwalk and you can still shoot through the gap
         * under it — which is what a handrail does, and what a solid block faking it
         * would get wrong. Tonio: "you should be able to shoot through the gap."
         *
         * Set `solidProxy: 'off'` to decline it and collide with the real geometry.
         */
        solid: 'off',
        /** Decline the automatic collision proxy described on `solid`. */
        solidProxy: 'on',
    };
    sceneReady(owner, scene) {
        super.sceneReady(owner, scene);
        const attrs = this;
        const meshName = attrs.mirror ? attrs.meshName + '_mirror' : attrs.meshName;
        this.mesh = BABYLON.MeshBuilder.CreateSphere(meshName, {
            segments: attrs.segments,
            diameter: attrs.diameter,
        }, scene);
        this.mesh.material = primitiveMaterial(meshName, scene, attrs);
        // A character's grounding probe and `moveWithCollisions` only see meshes
        // with this set, so `solid` is the whole of what makes a wall a wall.
        this.mesh.checkCollisions = !isOff(attrs.solid);
        if (!isOff(attrs.solid) && !isOff(attrs.solidProxy)) {
            addSolidProxy(this.mesh, scene);
        }
        owner.register({ meshes: [this.mesh] });
    }
}
export const b3dSphere = B3dSphere.elementCreator();
export class B3dBox extends AbstractMesh {
    static preferredTagName = 'tosi-b3d-box';
    static initAttributes = {
        ...AbstractMesh.initAttributes,
        meshName: 'box',
        size: 1,
        width: 0, // 0 = use size
        height: 0,
        depth: 0,
        color: '#ff0000',
        mirror: false,
        /**
         * Self-illumination, 0..1, as a fraction of `color` — `0.3` is a lit-from-
         * within look, `1` is a lamp. Needs `glowLayerIntensity` on the parent
         * `<tosi-b3d>` for the BLOOM; without it the surface still brightens, it
         * just doesn't bleed past its edges.
         *
         * `glowColor` overrides the hue, so a dull red box can throw yellow light.
         */
        glow: 0,
        glowColor: '',
        /**
         * `'on'` makes it SOLID — a character walks into it instead of through it.
         *
         * Off by default because most primitives in most scenes are scenery, and a
         * decorative box that silently starts blocking a doorway is a worse
         * surprise than one you have to ask to be solid. A `b3dGround` is always
         * solid; it is the one primitive nobody wants to fall through.
         *
         * A SHORT SOLID GETS AN INVISIBLE COLLISION PROXY, automatically.
         *
         * Babylon's character collision sweeps an ellipsoid, and it misses a
         * collider much under half a metre tall: measured against the biped, a bar
         * 0.2m or 0.4m tall is walked straight through, 0.6m and up stops it dead.
         * Height is the variable — a bar floating well clear of the floor stops a
         * character perfectly well if it is tall enough, and a bar resting ON the
         * floor does not if it is not.
         *
         * So anything solid and shorter than `MIN_SOLID_HEIGHT` gets a hidden box
         * of that height, centred on it, doing the colliding.
         *
         * ⚠️ THE PROXY IS NOT PICKABLE, and that is the point rather than an
         * implementation detail. Character collision reads `checkCollisions`;
         * projectiles, the ground probe and every cover query raycast against
         * PICKABLE meshes. Keeping the proxy out of the second set means a handrail
         * stops you walking off a catwalk and you can still shoot through the gap
         * under it — which is what a handrail does, and what a solid block faking it
         * would get wrong. Tonio: "you should be able to shoot through the gap."
         *
         * Set `solidProxy: 'off'` to decline it and collide with the real geometry.
         */
        solid: 'off',
        /** Decline the automatic collision proxy described on `solid`. */
        solidProxy: 'on',
    };
    sceneReady(owner, scene) {
        super.sceneReady(owner, scene);
        const attrs = this;
        const meshName = attrs.mirror ? attrs.meshName + '_mirror' : attrs.meshName;
        this.mesh = BABYLON.MeshBuilder.CreateBox(meshName, {
            size: attrs.size,
            width: attrs.width || attrs.size,
            height: attrs.height || attrs.size,
            depth: attrs.depth || attrs.size,
        }, scene);
        this.mesh.material = primitiveMaterial(meshName, scene, attrs);
        // A character's grounding probe and `moveWithCollisions` only see meshes
        // with this set, so `solid` is the whole of what makes a wall a wall.
        this.mesh.checkCollisions = !isOff(attrs.solid);
        if (!isOff(attrs.solid) && !isOff(attrs.solidProxy)) {
            addSolidProxy(this.mesh, scene);
        }
        owner.register({ meshes: [this.mesh] });
    }
}
export const b3dBox = B3dBox.elementCreator();
export class B3dGround extends AbstractMesh {
    static preferredTagName = 'tosi-b3d-ground';
    static initAttributes = {
        ...AbstractMesh.initAttributes,
        meshName: 'ground',
        size: 0, // square shortcut; >0 overrides width/height
        width: 4,
        height: 4,
        color: '#888888',
        // Optional surface texture on the (shadow-receiving) StandardMaterial: an
        // image URL, or a built-in procedural value — `'checker'` (a ruler: you can
        // count the squares) or `'noise'` (a mottled natural ground). Empty = flat
        // `color`. `textureTiles` is the repeat count across the plane for an image
        // or the checker; for `'noise'` it is the FEATURE COUNT, since that texture
        // is drawn once at the size of the whole plane and never repeats.
        texture: '',
        textureTiles: 8,
    };
    /**
     * Rectangles cut out of the ground (JS only, set before it is built), in
     * the ground's own x/z: a pool, a pit, a stairwell. The ground is then a
     * grid of 1 m cells with the cells inside a hole left out, so its texture
     * runs on unbroken around the hole (separate slabs would each start their
     * own). Give holes whole-metre edges, or a cell straddling one is kept.
     */
    holes = null;
    sceneReady(owner, scene) {
        super.sceneReady(owner, scene);
        const attrs = this;
        const meshName = attrs.meshName || 'ground';
        const w = attrs.size || attrs.width;
        const h = attrs.size || attrs.height;
        const holes = this.holes ?? [];
        this.mesh = BABYLON.MeshBuilder.CreateGround(meshName, holes.length
            ? {
                width: w,
                height: h,
                subdivisionsX: Math.min(512, Math.round(w)),
                subdivisionsY: Math.min(512, Math.round(h)),
            }
            : { width: w, height: h }, scene);
        if (holes.length)
            cutHoles(this.mesh, holes);
        const material = new BABYLON.StandardMaterial(meshName + '-mat', scene);
        material.diffuseColor = BABYLON.Color3.FromHexString(attrs.color);
        const texture = fetchedUrl(attrs.texture, 'b3d-ground texture');
        if (texture) {
            const tiles = Math.max(1, attrs.textureTiles);
            const noise = texture === 'noise';
            const tex = noise
                ? makeNoiseTexture(meshName + '-tex', scene, attrs.color, tiles)
                : texture === 'checker'
                    ? makeCheckerTexture(meshName + '-tex', scene, attrs.color)
                    : new BABYLON.Texture(texture, scene);
            // The noise texture already spans the plane — repeating it would put back
            // exactly the period it exists to avoid.
            tex.uScale = noise ? 1 : tiles;
            tex.vScale = noise ? 1 : tiles;
            material.diffuseTexture = tex;
            material.diffuseColor = BABYLON.Color3.White();
            material.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05);
        }
        this.mesh.material = material;
        // Opt into collisions so character controllers (biped/car) can stand on it —
        // their grounding probe and moveWithCollisions only see `checkCollisions` meshes.
        this.mesh.checkCollisions = true;
        owner.register({ meshes: [this.mesh] });
    }
}
export const b3dGround = B3dGround.elementCreator();
/** Leave out every triangle whose centre is inside one of `holes` (local x/z). */
function cutHoles(mesh, holes) {
    const pos = mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);
    const idx = mesh.getIndices();
    if (!pos || !idx)
        return;
    const inside = (x, z) => holes.some((o) => Math.abs(x - o.x) < o.width / 2 && Math.abs(z - o.z) < o.depth / 2);
    const kept = [];
    for (let t = 0; t < idx.length; t += 3) {
        const [a, b, c] = [idx[t], idx[t + 1], idx[t + 2]];
        const x = (pos[a * 3] + pos[b * 3] + pos[c * 3]) / 3;
        const z = (pos[a * 3 + 2] + pos[b * 3 + 2] + pos[c * 3 + 2]) / 3;
        if (!inside(x, z))
            kept.push(a, b, c);
    }
    mesh.setIndices(kept);
}
//# sourceMappingURL=b3d-primitives.js.map