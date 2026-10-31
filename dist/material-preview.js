/*
A material's swatch, rendered: one small picture of a recipe on a teapot
(The Base Mesh's, CC0, from the CDN; a sphere until it loads or if it cannot)
in a fixed studio, cached by the recipe, so a picker shows what a material LOOKS
like rather than its base colour.

One hidden engine renders every preview on the page, made the first time one
is asked for (one more WebGL context, once). Renders are queued and drawn one
at a time; a recipe already drawn costs nothing, so a panel full of fabrics
in a headset renders each once.
*/
import * as BABYLON from '@babylonjs/core';
// The teapot is a glb: register the loader even when this is imported alone.
import '@babylonjs/loaders';
import { applyMaterial } from './material-apply.js';
import { clothShading } from './cloth-shading.js';
import { studioEnvironment } from './environment.js';
import { canonicalMaterial } from './material-recipe.js';
import { assetUrl } from './asset-url.js';
/** What previews are drawn on: curves, a spout and a handle, a lid's crease. */
export const PREVIEW_MESH = 'thebasemesh/kitchen/teapot.glb';
const SIZE = 128;
let stage = null;
const cache = new Map();
let queue = Promise.resolve();
function makeStage() {
    if (typeof document === 'undefined')
        return null;
    const canvas = document.createElement('canvas');
    canvas.width = SIZE;
    canvas.height = SIZE;
    let engine;
    try {
        engine = new BABYLON.Engine(canvas, true, {
            preserveDrawingBuffer: true,
            alpha: true,
        });
    }
    catch {
        return null;
    }
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0, 0, 0, 0);
    studioEnvironment(scene, { intensity: 0.9 });
    const camera = new BABYLON.ArcRotateCamera('preview', 
    // From the side, a little ahead: the teapot's spout and handle lie
    // along z, so spout, handle and lid all show.
    0.45, 1.2, 3.1, BABYLON.Vector3.Zero(), scene);
    camera.fov = 0.6;
    const key = new BABYLON.DirectionalLight('key', new BABYLON.Vector3(-0.6, -0.8, 0.5), scene);
    key.intensity = 2.2;
    const ball = BABYLON.MeshBuilder.CreateSphere('ball', { diameter: 1.6, segments: 48 }, scene);
    const pbr = new BABYLON.PBRMaterial('preview-pbr', scene);
    const cloth = new BABYLON.PBRMaterial('preview-cloth', scene);
    const s = {
        engine,
        scene,
        canvas,
        pbr,
        cloth,
        shapes: [ball],
        ready: Promise.resolve(),
    };
    s.ready = BABYLON.SceneLoader.LoadAssetContainerAsync(assetUrl(PREVIEW_MESH), '', scene)
        .then((container) => {
        container.addAllToScene();
        const meshes = container.meshes.filter((m) => m.getTotalVertices() > 0);
        if (meshes.length === 0)
            return;
        // Fit it to the sphere's place: centred, about as big.
        const root = container.meshes[0];
        const { min, max } = root.getHierarchyBoundingVectors();
        const size = Math.max(max.x - min.x, max.y - min.y, max.z - min.z);
        root.scaling.scaleInPlace(2.1 / size);
        root.computeWorldMatrix(true);
        const b = root.getHierarchyBoundingVectors();
        root.position.subtractInPlace(b.min.add(b.max).scale(0.5));
        ball.dispose();
        s.shapes = meshes;
    })
        .catch(() => { });
    return s;
}
async function draw(recipe) {
    stage ??= makeStage();
    if (stage == null)
        return null;
    await stage.ready;
    const { scene, canvas } = stage;
    const wear = (m) => {
        for (const shape of stage.shapes)
            shape.material = m;
    };
    if (recipe.type === 'pbr') {
        applyMaterial(stage.pbr, recipe);
        wear(stage.pbr);
    }
    else if (recipe.type === 'cloth') {
        // A fresh look each time: the shading keeps what a recipe leaves out.
        stage.cloth.roughness = 0.85;
        stage.cloth.metallic = 0;
        stage.cloth.sheen.isEnabled = false;
        clothShading(stage.cloth).set({ recipe });
        wear(stage.cloth);
    }
    else
        return null;
    await scene.whenReadyAsync();
    scene.render();
    return canvas.toDataURL('image/png');
}
/**
 * A picture of the recipe, as a data URL, or `null` where none can be drawn
 * (no WebGL, or a type with no preview). Cached by the canonical recipe.
 */
export function materialPreview(recipe) {
    const key = JSON.stringify(canonicalMaterial(recipe));
    let p = cache.get(key);
    if (p == null) {
        const r = canonicalMaterial(recipe);
        p = queue.then(() => draw(r)).catch(() => null);
        queue = p;
        cache.set(key, p);
        // Oldest out first: a long edit session should not hold every step.
        if (cache.size > 300)
            cache.delete(cache.keys().next().value);
    }
    return p;
}
//# sourceMappingURL=material-preview.js.map