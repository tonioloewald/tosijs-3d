/*#
# character

**A character from its settings, ready to animate.** The
[character builder](/character-builder/) is a panel over this: what it sets is
a character's SETTINGS (a body, a skin, hair, clothes, a face, a rig), and
`makeCharacter` turns them into a dressed, rigged body in a scene. The same
settings, read from a [character file](/character-file/), make the same
character anywhere: a game puts it under a biped and plays clips on it.

## Demo

```js
import { b3d, b3dBiped, b3dSun, b3dLight, b3dGround, inputFocus, ualAnimationStates } from 'tosijs-3d'

preview.append(
  b3d(
    { style: 'width:100%;height:100%', gamepad: 'left_stick,right_stick' },
    b3dSun({ timeOfDay: 15, shadowTextureSize: 2048 }),
    b3dLight({ intensity: 0.5 }),
    b3dGround({ width: 40, height: 40, color: '#5d6672' }),
    inputFocus(
      b3dBiped({
        character: '/characters/casual.character.json',
        animationStates: ualAnimationStates(),
        player: true,
        cameraType: 'follow',
      })
    )
  )
)
```
```css
tosi-b3d { width: 100%; height: 100%; }
```

A character file exported from the [character builder](/character-builder/)
(**export JSON**), walking under a `<tosi-b3d-biped character="…">`: move with
WASD or the left stick, look with the mouse or the right stick. The biped
makes the character from the file and retargets UAL's clips onto it, so its
states are UAL's (`ualAnimationStates`). Making it takes a few seconds: the
body's skin is bound when it is made.

## In code

```
const assets = await loadCharacterAssets(scene)
const character = await makeCharacter(scene, assets, {
  settings: readCharacter(doc).character.settings,
  gaze: () => camera.position,
})
character.root.parent = someNode           // move it by this
const walk = retargetClip(ualWalk, ualSkeleton, character.skeleton, {
  scene, armSpaceDeg: character.recipe?.armSpaceDeg,
})
walk.start(true)
character.set({ smile: 0.6, hair: 'short02' })  // change it live
```

The body is MakeHuman's, shaped by its sliders, or a mesh from a file (a
`source`: Blender's Human Base Meshes, Quaternius' characters, your own),
rigged from its rig recipe (`rigs`, the [rig tool](/rig-tool/)'s) or its own
skin when it is skinned to UAL's skeleton. MakeHuman's body wears MakeHuman's
clothes, hair and face; any body wears the garments made on it
(`addGarment`, from the [tailor](/tailor-tool/) or Blender).

`set(changes)` applies only what changed: a slider reshapes the body, a slot
dresses it again, a colour repaints. The work is in `ready()`.

## The settings

`DEFAULT_CHARACTER` lists them with their defaults: MakeHuman's macro sliders
(`DEFAULT_HUMAN_BODY`), `tone` and `redness` (the skin), `iris` and
`irisColour`, `stubble`, the hair (`hair`, `beard`, `moustache`, `brows`,
`hairBase`, `hairHighlight`, and `hairUp`, `hairForward`, `hairSize` to
nudge it), one setting per clothes slot (`CHARACTER_SLOTS`, a garment's name
or `none`), the face (`smile`, `browsUp`, `frown`, and `blink`, `talk`),
`source` (`MakeHuman` or a mesh's name), `rigs` (each mesh's rig recipe) and
`surfaces` (each mesh's materials, `as made` or `skin`). `hideClothes` takes
everything worn off for a moment (the tailor's "hide other clothes").

Each slot's material is separate (`setCloth(slot, { look, material })`): a
garment's colourway and a material recipe over it.
*/
/*{ "parent": "character-builder" }*/
import * as BABYLON from '@babylonjs/core';
import { loadHumanPack } from './human-pack.js';
import { macroWeights, morphHuman, DEFAULT_HUMAN_BODY } from './human-morph.js';
import { humanSkin, humanBodyMaker } from './human-rig.js';
import { skinMaterial, lipTint, stubbleTint } from './character-builder.js';
import { humanFace, bodyEyes, eyeGaze, eyeTexture, eyeMaterial, lashMaterial, } from './human-face.js';
import { loadHairLibrary, headScalp, hairMaterial, humanHair, } from './human-hair.js';
import { skinThinness } from './skin-shading.js';
import { vertexNormals } from './hair-fit.js';
import { nearestWeights, coveredBy, fitProxy, drawnPositions, underCover, inflate, proxyDelta, smoothUnder, } from './proxy-fit.js';
import { skinAlbedo } from './skin-tone.js';
import { humanProxy, proxyMaterial, coverBody } from './human-proxy.js';
import { hairShading, HAIR_COLOURS } from './hair-shading.js';
import { clothShading, clothRecipe } from './cloth-shading.js';
import { faceDeltas, humanExpressions, blinker, lidsFollow, babble, } from './human-expression.js';
import { readSkeleton } from './retarget-babylon.js';
import { bindGarment } from './garment-bind.js';
import { readGarment, garmentRigidity } from './garment-file.js';
import { loadRigTriangles, loadSkinnedBody, buildBody, soleVertices, lowestOf, surfaceMaterial, } from './rig-build.js';
import { bodyFromMarkers, lidBlink } from './rigged-body.js';
import { applyRigRecipe } from './rig-recipe-babylon.js';
import { assetUrl } from './asset-url.js';
/** What can be worn, one of each at a time. */
export const CHARACTER_SLOTS = [
    'outfit',
    'bodysuit',
    'armour',
    'top',
    'bottom',
    'shoes',
    'gloves',
    'hat',
    'mask',
    'glasses',
];
/** Every setting a character has, with its default. */
export const DEFAULT_CHARACTER = {
    ...DEFAULT_HUMAN_BODY,
    gender: 1,
    tone: 0.3,
    redness: 0.5,
    iris: 0.2,
    irisColour: '#5a3519',
    hair: 'short02',
    beard: 'none',
    moustache: 'none',
    brows: 'eyebrow001',
    hairBase: HAIR_COLOURS.brown.base,
    hairHighlight: HAIR_COLOURS.brown.highlight,
    hairUp: 0,
    hairForward: 0,
    hairSize: 1,
    outfit: 'male_casualsuit02',
    bodysuit: 'none',
    armour: 'none',
    top: 'none',
    bottom: 'none',
    shoes: 'shoes01',
    hat: 'none',
    glasses: 'none',
    gloves: 'none',
    mask: 'none',
    stubble: 0,
    blink: true,
    talk: false,
    smile: 0,
    browsUp: 0,
    frown: 0,
    hideClothes: false,
    rigs: {},
    surfaces: {},
    source: 'MakeHuman',
};
// A hosted body: its URL is read when it is used, after the page has set
// the asset base (computed at import, it came out relative to the page).
const hosted = (path, pick) => ({
    get url() {
        return assetUrl(path);
    },
    ...(pick != null ? { pick } : {}),
});
/** The bodies a character can have besides MakeHuman's. */
export const CHARACTER_SOURCES = {
    'Blender: female, realistic': hosted('blender/human-base-meshes/body-female-realistic.glb'),
    'Blender: male, realistic': hosted('blender/human-base-meshes/body-male-realistic.glb'),
    'Quaternius: superhero, male': hosted('quaternius/libraries/characters-superhero-male.glb', 'Superhero_Male_FullBody'),
    'Quaternius: superhero, female': hosted('quaternius/libraries/characters-superhero-female.glb', 'Superhero_Female_FullBody'),
};
/** Load the pack and the hair library (once per scene). */
export async function loadCharacterAssets(scene, options = {}) {
    const [pack, hair] = await Promise.all([
        loadHumanPack(options.pack ?? assetUrl('makehuman/hm08/hm08.json', 17)),
        loadHairLibrary(scene, options.hair ?? assetUrl('quaternius/libraries/hairstyles.glb', 2)),
    ]);
    return { pack, hair };
}
const plain = (v) => JSON.parse(JSON.stringify(v));
const linearHex = (hex) => {
    const n = parseInt(hex.slice(1, 7), 16);
    const lin = (c) => c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    return {
        r: lin(((n >> 16) & 255) / 255),
        g: lin(((n >> 8) & 255) / 255),
        b: lin((n & 255) / 255),
    };
};
// A saved look: a material recipe, or the fabric, colour and recolour saved before recipes.
const lookRecipe = (look) => look?.material ?? clothRecipe(look ?? {});
// How far a hat is pushed out from the skull, over the hair (metres).
const HAT_LIFT = 0.012;
/**
 * Make a character in a scene from its settings. Resolves once the body is
 * built and dressed.
 */
export async function makeCharacter(scene, assets, options = {}) {
    const { pack, hair: hairLib } = assets;
    const SLOTS = CHARACTER_SLOTS;
    const s = {
        ...plain(DEFAULT_CHARACTER),
        ...plain(options.settings ?? {}),
    };
    const sources = {
        ...(options.sources ?? CHARACTER_SOURCES),
    };
    const status = (m) => options.handleStatus?.(m);
    const register = (meshes) => options.handleMeshes?.(meshes);
    const cloth = Object.fromEntries(SLOTS.map((slot) => [
        slot,
        options.cloth?.[slot]
            ? plain(options.cloth[slot])
            : {
                look: 'as made',
                material: clothRecipe({
                    fabric: slot === 'shoes' ? 'leather' : 'cotton',
                    colour: '#7a2e2e',
                    recolour: 0,
                }),
            },
    ]));
    const madeHuman = () => s.source === 'MakeHuman';
    let disposed = false;
    // The work in hand: changes are applied one after another.
    let work = Promise.resolve();
    const queue = (fn) => {
        work = work.then(fn).catch((e) => console.warn('character:', e));
        return work;
    };
    /*
    THE CHOICES: MakeHuman's own hair, brows, beards and clothes first (drawn
    for this body and bound to it), Quaternius' hairstyles after (fitted).
    */
    const proxies = pack.manifest.proxies ?? {};
    const kinds = (cat, test) => Object.keys(proxies).filter((n) => proxies[n].category === cat && test(n));
    const adult = (n) => !n.endsWith('_Teen');
    const facial = (n) => /Beard|Moustache|MuttonChops/.test(n);
    const styles = {
        hair: [
            'none',
            ...kinds('hair', () => true),
            ...hairLib.names('hair').filter((n) => adult(n) && !facial(n)),
        ],
        // MakeHuman's beards come without moustaches: a moustache is its own
        // choice. Quaternius' are drawn for its own stylised mouth.
        beard: ['none', ...kinds('beard', (n) => !/moustache/i.test(n))],
        moustache: ['none', ...kinds('beard', (n) => /moustache/i.test(n))],
        brows: [
            'none',
            ...kinds('eyebrows', () => true),
            ...hairLib.names('eyebrows').filter(adult),
        ],
    };
    for (const slot of SLOTS)
        styles[slot] = [
            'none',
            ...Object.keys(proxies).filter((n) => proxies[n].slot === slot),
        ];
    /*
    MATERIALS: one per worn thing and colourway, shared; clothes take a
    fabric and a recolour, hair the hair colours.
    */
    const proxyMaterials = new Map();
    const clothes = new Map();
    const slotMaterial = {};
    const refabric = () => {
        for (const [slot, m] of Object.entries(slotMaterial))
            clothes.get(m)?.set({ recipe: cloth[slot].material });
    };
    const shades = [];
    const tints = new Map();
    const tint = (part) => {
        const from = part.material;
        if (!tints.has(from)) {
            const m = hairMaterial(scene, from, `hair-${tints.size}`);
            shades.push(hairShading(m, { base: s.hairBase, highlight: s.hairHighlight }));
            tints.set(from, m);
        }
        return tints.get(from);
    };
    const garmentMaterial = (proxy, slot) => {
        const look = slot && cloth[slot].look !== 'as made' ? cloth[slot].look : undefined;
        const key = `${proxy.name}:${look ?? ''}`;
        if (!proxyMaterials.has(key)) {
            const m = proxyMaterial(scene, proxy, look);
            if (['hair', 'eyebrows', 'beard'].includes(proxy.category))
                shades.push(hairShading(m, {
                    desaturate: true,
                    base: s.hairBase,
                    highlight: s.hairHighlight,
                }));
            else if (proxy.category === 'clothes')
                clothes.set(m, clothShading(m));
            proxyMaterials.set(key, m);
        }
        const m = proxyMaterials.get(key);
        // The cache is by name: a tailored garment turns skirt (two-sided) on and off.
        m.backFaceCulling = !proxy.material?.twoSided;
        m.twoSidedLighting = proxy.material?.twoSided === true;
        if (slot)
            slotMaterial[slot] = m;
        return m;
    };
    /*
    GARMENTS OF YOUR OWN: a file each. One made on MakeHuman's body is bound to
    it (on the slider values it was made on, when the file says); one made on
    a mesh's body is bound to that body when it is shown.
    */
    const garments = new Map();
    const imageUrl = (img) => img
        ? URL.createObjectURL(new Blob([img.bytes], { type: img.mimeType }))
        : undefined;
    const fileLook = (m) => m
        ? {
            diffuse: imageUrl(m.baseColorTexture),
            normal: imageUrl(m.normalTexture),
            metallicRoughness: imageUrl(m.metallicRoughnessTexture),
            roughness: m.roughness,
            metallic: m.metallic,
            baseColor: m.baseColor,
            normalScale: m.normalScale,
            alpha: m.alphaMode !== 'OPAQUE',
            blend: m.alphaMode === 'BLEND',
            alphaCutoff: m.alphaMode === 'MASK' ? m.alphaCutoff : undefined,
            twoSided: m.doubleSided,
        }
        : { alpha: false, twoSided: false };
    const proxyFrom = (binding, content, name, slot) => {
        const { garment, meta, material } = content;
        return {
            ...binding,
            triangles: garment.triangles,
            uvs: garment.uvs ?? new Float32Array(binding.rows * 2),
            delete: null,
            name,
            category: 'clothes',
            slot,
            material: {
                ...fileLook(material),
                ...(meta?.cut?.skirt ? { twoSided: true } : {}),
            },
        };
    };
    const proxyOn = (g, r) => {
        if (!g.bound.has(r)) {
            const { garment } = g.content;
            g.bound.set(r, proxyFrom(bindGarment(r.body.positions, r.body.indices, garment.positions, garmentRigidity(garment)), g.content, g.name, g.slot));
        }
        return g.bound.get(r);
    };
    const addGarment = async (bytes) => {
        const content = readGarment(bytes);
        const meta = content.meta ?? {};
        const name = meta.name ?? 'garment';
        const slot = SLOTS.includes(meta.slot) ? meta.slot : 'top';
        const source = meta.source ?? 'MakeHuman';
        proxyMaterials.delete(`${name}:`);
        let proxy = null;
        if (source === 'MakeHuman') {
            const on = meta.body
                ? await morphHuman(pack, macroWeights({ ...DEFAULT_HUMAN_BODY, ...meta.body }, (n) => pack.has(n)))
                : current;
            const { garment } = content;
            proxy = proxyFrom(bindGarment(on, pack.triangles, garment.positions, garmentRigidity(garment)), content, name, slot);
            if (!styles[slot].includes(name))
                styles[slot].push(name);
        }
        const g = {
            name,
            slot,
            source,
            proxy,
            content,
            bound: new WeakMap(),
            bytes: new Uint8Array(bytes),
            meta,
            cut: meta.cut,
            look: meta.look,
        };
        garments.set(name, g);
        return g;
    };
    // A garment of your own worn in a slot, if it was made on the body shown.
    const ownIn = (slot) => {
        const g = garments.get(s[slot]);
        return g && g.source === s.source ? g : null;
    };
    /*
    MAKEHUMAN'S BODY: shaped by the sliders, with weights bound once on the
    first shape (they depend only on the topology).
    */
    status('binding the skin…');
    // Let a message paint before the binding takes the thread.
    await new Promise((r) => setTimeout(r, 50));
    const skin = humanSkin(pack);
    const [lips, nipples, eyePart, lashPart] = await Promise.all([
        pack.region('lips'),
        pack.region('nipples'),
        pack.part('eyes'),
        pack.part('eyelashes'),
    ]);
    const eyes = eyeTexture(scene, { iris: s.iris });
    eyes.setIrisColour(s.irisColour);
    const faceMaterials = {
        eye: eyeMaterial(scene, eyes),
        lashes: lashMaterial(scene),
    };
    const sliders = () => Object.fromEntries(Object.keys(DEFAULT_HUMAN_BODY).map((k) => [k, Number(s[k])]));
    const maker = await humanBodyMaker(pack, sliders());
    const first = maker.first.full;
    // How thin the body is at each vertex (ears, nose, fingers), for the
    // skin's back-light: once, like the weights.
    const firstSkin = skin.positions(first);
    const thin = skinThinness(firstSkin, vertexNormals(firstSkin, skin.triangles));
    // Weights for every pack vertex, so clothes bound to helper vertices (the
    // tights and skirt shells, which carry no skin) bend too.
    const known = new Int32Array(pack.manifest.vertexCount).fill(-1);
    skin.vertices.forEach((v, i) => {
        known[v] = i;
    });
    const allWeights = nearestWeights(first, known, maker.weights);
    let current = first;
    // What clothes are fitted over: the body with its nipples smoothed,
    // because cloth bridges them (the skin keeps them).
    const smoothed = (p) => nipples ? smoothUnder(p, pack.triangles, nipples) : p;
    let clothBody = smoothed(first);
    let human = null;
    let built = null;
    let face = null;
    let scalp = null;
    let hairMeshes = [];
    // The face: MakeHuman's face pose units as morph targets, in layers.
    const expressions = humanExpressions(scene, await faceDeltas(pack));
    let stopBlink = null;
    // Bodies with lids made from their shape blink with the same timer.
    const lidded = new Set();
    const blinking = () => {
        stopBlink?.();
        stopBlink = s.blink ? blinker(scene, expressions) : null;
        for (const r of lidded) {
            r.stopBlink?.();
            r.stopBlink = s.blink ? blinker(scene, r.lids) : null;
        }
    };
    blinking();
    const stopLids = lidsFollow(scene, expressions, () => face);
    let stopTalk = null;
    const talking = () => {
        stopTalk?.();
        stopTalk = s.talk ? babble(scene, expressions) : null;
    };
    talking();
    const mood = expressions.layer('mood');
    const feel = () => {
        const { smile: sm, browsUp: b, frown: f } = s;
        mood.setMany({
            MouthLeftPullUp: sm,
            MouthRightPullUp: sm,
            LeftCheekUp: sm * 0.6,
            RightCheekUp: sm * 0.6,
            LeftOuterBrowUp: b,
            RightOuterBrowUp: b,
            LeftInnerBrowUp: b,
            RightInnerBrowUp: b,
            LeftBrowDown: f,
            RightBrowDown: f,
        });
    };
    feel();
    // Whose eyes look (set once what is shown is known; frames run before that).
    let eyesShown = () => face;
    const stopGaze = eyeGaze(scene, 
    // The shown body's eyes: MakeHuman's, or a file's own eyeballs.
    {
        get eyes() {
            return eyesShown()?.eyes ?? [];
        },
        get forward() {
            return eyesShown()?.forward ?? [];
        },
    }, () => options.gaze?.() ?? null);
    /*
    THE SKIN: its colour from two dials, the lips as vertex colours over it,
    and stubble where a full beard grows.
    */
    const mat = skinMaterial(scene, { tone: s.tone, redness: s.redness });
    let stubbleMask = null;
    const proxyNamed = (re) => Object.keys(proxies).find((n) => re.test(n));
    const beardFor = proxyNamed(/scruffy_beard/);
    const tacheFor = proxyNamed(/moustache/);
    const paint = () => {
        mat.setSkin(s.tone, s.redness);
        if (lips && built) {
            const colours = lipTint(skin, lips, s.tone, s.redness, undefined, thin);
            if (stubbleMask)
                stubbleTint(colours, stubbleMask, s.stubble, skinAlbedo(s.tone, s.redness), linearHex(s.hairBase));
            built.mesh.setVerticesData('color', colours);
        }
    };
    const measureStubble = async () => {
        if (!beardFor || !current)
            return;
        const body = skin.positions(current);
        const normals = vertexNormals(body, skin.triangles);
        const grownOn = async (name) => {
            const p = (await pack.proxy(name));
            return coveredBy(body, normals, drawnPositions(p, fitProxy(p, current)), 0.02);
        };
        // Where a full beard grows, and a moustache: the full beard has no
        // moustache part, so the upper lip was bare.
        const beard = await grownOn(beardFor);
        const tache = tacheFor ? await grownOn(tacheFor) : null;
        // The beard below the cheekbones: up to a little above the upper lip,
        // faded (the full beard climbs the cheeks, and stubble there read as a bruise).
        let lipTop = -Infinity;
        for (let v = 0; v < lips.length; v++)
            if (lips[v] > 0.5)
                lipTop = Math.max(lipTop, current[v * 3 + 1]);
        const cap = lipTop + 0.03;
        const smooth = (t) => {
            t = Math.min(1, Math.max(0, t));
            return t * t * (3 - 2 * t);
        };
        const n = body.length / 3;
        const mask = new Float32Array(n);
        for (let i = 0; i < n; i++) {
            const b = beard[i] === Infinity ? 0 : smooth((cap - body[i * 3 + 1]) / 0.015);
            const t = tache && tache[i] !== Infinity ? 1 : 0;
            // Not on the lips themselves.
            mask[i] =
                Math.max(b, t) * (1 - smooth((lips[skin.vertices[i]] - 0.05) / 0.45));
        }
        // Down the neck: the full beard stops at the jaw, but stubble grows on
        // the throat and the sides of the neck, fading over 5 cm below the
        // beard's edge. Front and sides only (the normal faces forward or out).
        const edge = [];
        let low = Infinity;
        for (let i = 0; i < n; i++)
            if (mask[i] > 0.5 && body[i * 3 + 1] < lipTop) {
                edge.push(i);
                low = Math.min(low, body[i * 3 + 1]);
            }
        const REACH = 0.05;
        for (let i = 0; i < n; i++) {
            const y = body[i * 3 + 1];
            if (mask[i] > 0.5 ||
                y > lipTop ||
                y < low - REACH ||
                normals[i * 3 + 2] < -0.2)
                continue;
            let d = Infinity;
            for (const j of edge) {
                if (body[j * 3 + 1] < y)
                    continue;
                const dx = body[j * 3] - body[i * 3];
                const dy = body[j * 3 + 1] - y;
                const dz = body[j * 3 + 2] - body[i * 3 + 2];
                d = Math.min(d, dx * dx + dy * dy + dz * dz);
            }
            mask[i] = Math.max(mask[i], smooth(1 - Math.sqrt(d) / REACH));
        }
        stubbleMask = mask;
        paint();
    };
    /*
    DRESSING MAKEHUMAN'S BODY: what it wears from the pack and of your own,
    bound; hair fitted from Quaternius' heads; a hat tucks the hair under it;
    the skin under clothes is tucked in.
    */
    let sole = 0;
    let dressing = 0;
    const dress = async () => {
        if (!built || !scalp)
            return;
        const token = ++dressing;
        const names = [
            ...[...SLOTS, 'hair', 'brows', 'beard', 'moustache'].map((k) => s[k]),
            'teeth_base',
            'tongue01',
        ].filter((n) => proxies[n] || garments.get(n)?.proxy);
        let wearing = await Promise.all(names.map((n) => garments.has(n) ? garments.get(n).proxy : pack.proxy(n)));
        if (token !== dressing || disposed)
            return;
        if (s.hideClothes)
            wearing = wearing.filter((p) => p.category !== 'clothes');
        for (const m of hairMeshes)
            m.dispose();
        hairMeshes = [];
        const nudge = { y: s.hairUp, z: s.hairForward, scale: s.hairSize };
        for (const key of ['hair', 'beard', 'moustache', 'brows']) {
            const parts = hairLib.piece(s[key]);
            if (!parts)
                continue;
            // Brows and beards follow the face; hair follows the skull.
            const style = s[key];
            hairMeshes.push(...humanHair(scene, built, built.rig, scalp, parts, tint, {
                name: key,
                on: hairLib.fitFor(style),
                head: hairLib.headFor(style),
                centreY: key === 'brows' ? scalp.brow : undefined,
                nudge: key === 'hair' ? nudge : undefined,
            }));
        }
        for (const k of Object.keys(slotMaterial))
            delete slotMaterial[k];
        for (const proxy of wearing) {
            const slot = SLOTS.find((k) => s[k] === proxy.name) ?? null;
            const m = garmentMaterial(proxy, slot);
            // A hat sits a little out from the head, over the hair.
            const fit = slot === 'hat'
                ? { inflate: { centre: scalp.centre, by: HAT_LIFT } }
                : slot === 'armour'
                    ? { lift: 0.005 }
                    : {};
            const mesh = humanProxy(scene, built, proxy, clothBody, allWeights, m, fit);
            mesh.metadata = { category: proxy.category };
            hairMeshes.push(mesh);
        }
        // A hat hides the hair under its brim, or the hair pokes through it.
        const hat = wearing.find((p) => p.name === s.hat);
        if (hat) {
            const crown = inflate(drawnPositions(hat, fitProxy(hat, current)), scalp.centre, HAT_LIFT);
            const at = built.rig.at('Head');
            for (const mesh of hairMeshes) {
                const isHair = mesh.name.startsWith('hair-') || mesh.metadata?.category === 'hair';
                if (!isHair || !(mesh instanceof BABYLON.Mesh))
                    continue;
                // Quaternius' hair hangs on the head, in its frame less the head joint.
                const p = Float32Array.from(mesh.getVerticesData('position'));
                if (mesh.name.startsWith('hair-'))
                    for (let i = 0; i < p.length; i += 3) {
                        p[i] += at.x;
                        p[i + 1] += at.y;
                        p[i + 2] += at.z;
                    }
                const tucked = Float32Array.from(p);
                mesh.setIndices(Array.from(underCover(crown, p, mesh.getIndices(), 24, tucked)));
                if (mesh.name.startsWith('hair-'))
                    for (let i = 0; i < tucked.length; i += 3) {
                        tucked[i] -= at.x;
                        tucked[i + 1] -= at.y;
                        tucked[i + 2] -= at.z;
                    }
                mesh.setVerticesData('position', tucked, true);
            }
        }
        refabric();
        // Stand on the soles: shoes reach below the bare foot by their sole.
        const shoe = wearing.find((p) => p.name === s.shoes);
        sole = 0;
        if (shoe) {
            const fitted = fitProxy(shoe, current);
            let low = Infinity;
            for (let i = 1; i < fitted.length; i += 3)
                low = Math.min(low, fitted[i]);
            sole = Math.max(0, built.rig.at('root').y - low);
        }
        // Skin under clothes is hidden, so it cannot show through: the garments
        // as fitted, for the skin they cover but do not list.
        const drawn = new Map(wearing
            .filter((p) => p.category === 'clothes')
            .map((p) => [p.name, drawnPositions(p, fitProxy(p, clothBody))]));
        coverBody(built, skin.triangles, skin.vertices, wearing, { drawn });
        // Everything that moves with the face, after the tuck (its rest).
        expressions.attach(built.mesh, (d) => skin.positions(d));
        for (const m of face?.meshes ?? []) {
            const pv = m.metadata?.packVertices;
            // The eyeballs turn; they never deform.
            if (!pv || m.name.startsWith('eye_'))
                continue;
            expressions.attach(m, (d) => {
                const out = new Float32Array(pv.length * 3);
                for (let i = 0; i < pv.length; i++) {
                    out[i * 3] = d[pv[i] * 3];
                    out[i * 3 + 1] = d[pv[i] * 3 + 1];
                    out[i * 3 + 2] = d[pv[i] * 3 + 2];
                }
                return out;
            });
        }
        for (const proxy of wearing) {
            const mesh = hairMeshes.find((m) => m.name === `proxy-${proxy.name}`);
            if (mesh)
                expressions.attach(mesh, (d) => proxyDelta(proxy, d));
        }
        register(hairMeshes);
        placeRoot();
    };
    const root = new BABYLON.TransformNode('character', scene);
    // Raised so the soles are on y = 0 (a clip may carry them lower: groundFor).
    const body = new BABYLON.TransformNode('character-body', scene);
    body.parent = root;
    let clipLow = null;
    let shownNow = null;
    const placeRoot = () => {
        if (!shownNow)
            return;
        body.position.y =
            -(clipLow ?? shownNow.rig.at('root').y) + (shownNow === built ? sole : 0);
    };
    const rebuild = async () => {
        const made = await maker.body(sliders());
        if (disposed)
            return;
        const full = made.full;
        current = full;
        clothBody = smoothed(full);
        stubbleMask = null;
        face?.dispose();
        built?.dispose();
        built = buildBody(scene, 'character-human', made);
        human = made;
        face = humanFace(scene, built, made.rig, pack.manifest, full, { eyes: eyePart, eyelashes: lashPart }, faceMaterials);
        built.rig = made.rig;
        scalp = headScalp(pack.manifest, full, pack.triangles, { lips });
        built.mesh.material = mat;
        built.root.parent = body;
        register([built.mesh, ...face.meshes]);
        await dress();
        if (s.stubble > 0)
            await measureStubble();
        paint();
        if (madeHuman())
            show(built);
        else
            built.root.setEnabled(false);
    };
    /*
    A MESH'S BODY: its triangles (or its own skin) loaded once, rigged from
    its recipe (the rig tool's markers, else a first guess off its outline),
    kept until the recipe changes. It wears its own materials, or the skin.
    */
    const triangles = new Map();
    const skinned = new Map();
    const rigged = new Map();
    let other = null;
    let problem = '';
    const recipeOf = (name) => plain(s.rigs ?? {})[name] ?? null;
    const rig = async (name) => {
        const from = sources[name];
        if (!from)
            throw new Error('no such body');
        const kept0 = recipeOf(name);
        if (!kept0?.binding) {
            if (!skinned.has(name))
                skinned.set(name, await loadSkinnedBody(scene, from.file ?? from.url, {
                    pick: from.pick,
                }));
            const own = skinned.get(name);
            if (own)
                return wear(own, kept0, name);
        }
        if (!triangles.has(name))
            triangles.set(name, await loadRigTriangles(scene, from.file ?? from.url, {
                pick: from.pick,
            }));
        const kept = recipeOf(name);
        const b = kept?.binding;
        return wear(bodyFromMarkers(triangles.get(name), {
            markers: b?.markers,
            tail: b?.tail,
            tailBase: b?.tailBase,
            joints: b?.joints,
            source: name,
        }), kept, name);
    };
    // A rigged body on the stand, with its recipe.
    const wear = (made, kept, name) => {
        const r = buildBody(scene, `character-${name}`, made);
        r.kept = JSON.stringify(kept);
        r.source = name;
        // A body bound from markers carries them in its recipe, so the rig tool
        // binds the same mesh from the same markers; one with its own skin opens
        // on its own skeleton.
        const m = made.made;
        r.recipe = {
            version: 1,
            roles: {},
            armSpaceDeg: 0,
            springs: [],
            ...kept,
            ...(m.by === 'markers'
                ? {
                    binding: {
                        markers: m.markers,
                        tail: m.tail ?? null,
                        ...(m.tailBase ? { tailBase: m.tailBase } : {}),
                        ...(m.joints ? { joints: m.joints } : {}),
                    },
                }
                : {}),
        };
        dressSurfaces(r);
        // Its own eyeballs, if the file has them: on pivots, in the eye material.
        if (made.eyes?.length) {
            r.face = bodyEyes(scene, r, made.rig, made.eyes, faceMaterials.eye);
            register(r.face.meshes);
            // And lids that close over them, if the skin opens round them: on a
            // body rigged from markers (Blender's base meshes, your own). A file
            // that comes skinned is an artist's character, and Quaternius' big
            // stylised eyes stand proud of the face, so a lid turned over them
            // leaves a line of white.
            const [left, right] = made.made.by === 'markers'
                ? made.eyes.map((eye) => lidBlink(made.positions, eye))
                : [];
            const units = new Map();
            if (left)
                units.set('LeftUpperLidClosed', left);
            if (right)
                units.set('RightUpperLidClosed', right);
            if (units.size) {
                r.lids = humanExpressions(scene, units);
                r.lids.attach(r.mesh, (d) => d);
                r.stopLids = lidsFollow(scene, r.lids, () => r.face);
                r.stopBlink = s.blink ? blinker(scene, r.lids) : null;
                lidded.add(r);
            }
        }
        const dispose = r.dispose;
        r.dispose = () => {
            lidded.delete(r);
            r.stopBlink?.();
            r.stopLids?.();
            r.lids?.dispose();
            r.face?.dispose();
            r.applied?.dispose();
            r.multi?.dispose(false, false, false);
            for (const c of r.clothes ?? [])
                c.dispose();
            dispose();
        };
        r.root.parent = body;
        r.root.setEnabled(false);
        register([r.mesh]);
        return r;
    };
    // Each surface as made or in the skin: a plain mesh of one untextured
    // material takes the skin; anything with textures or several materials is
    // shown as made.
    const surfaceChoice = (r, surface) => {
        const kept = plain(s.surfaces ?? {})[r.source]?.[surface.name];
        if (kept)
            return kept;
        const made = surface.material;
        const textured = (made?.getActiveTextures().length ?? 0) > 0;
        return made && (textured || r.body.surfaces.length > 1) ? 'as made' : 'skin';
    };
    const dressSurfaces = (r) => {
        r.multi?.dispose(false, false, false);
        const m = surfaceMaterial(scene, r.mesh.name, r.body, (surface) => surface?.material && surfaceChoice(r, surface) === 'as made'
            ? surface.material
            : mat);
        r.multi = m instanceof BABYLON.MultiMaterial ? m : null;
        r.mesh.material = m;
    };
    // Dressed: the garments made on it, bound to its skin; the skin under them tucked.
    const dressOther = () => {
        const r = other;
        if (!r)
            return;
        for (const m of r.clothes ?? [])
            m.dispose();
        r.clothes = [];
        for (const k of Object.keys(slotMaterial))
            delete slotMaterial[k];
        const worn = s.hideClothes
            ? []
            : SLOTS.filter((slot) => ownIn(slot)?.slot === slot);
        const wearing = worn.map((slot) => proxyOn(ownIn(slot), r));
        worn.forEach((slot, i) => {
            const mesh = humanProxy(scene, r, wearing[i], r.body.positions, r.body.weights, garmentMaterial(wearing[i], slot), slot === 'armour' ? { lift: 0.005 } : {});
            mesh.metadata = { category: 'clothes' };
            r.clothes.push(mesh);
        });
        refabric();
        const drawn = new Map(wearing.map((p) => [
            p.name,
            drawnPositions(p, fitProxy(p, r.body.positions)),
        ]));
        r.everyVertex ??= Uint32Array.from({ length: r.body.positions.length / 3 }, (_, i) => i);
        coverBody(r, r.body.indices, r.everyVertex, wearing, { drawn });
        // The lids again, over the tucked skin (a target holds whole positions).
        r.lids?.attach(r.mesh, (d) => d);
        register(r.clothes);
    };
    const hideOther = () => {
        other?.applied?.dispose();
        if (other)
            other.applied = null;
        other?.root.setEnabled(false);
    };
    /*
    WHAT IS ON SHOW, and its skeleton read for clips.
    */
    let read = null;
    let hidden = false;
    const show = (r) => {
        shownNow = r;
        if (r === built)
            read = readSkeleton(built.skeleton, built.root);
        else {
            // The recipe's springs (a tail, a ponytail) on the body shown.
            r.applied = applyRigRecipe(scene, r.root, r.skeleton, r.recipe);
            read = r.applied.read;
        }
        r.root.setEnabled(!hidden);
        clipLow = null;
        placeRoot();
        options.handleShown?.(shown());
    };
    eyesShown = () => shownNow == null ? null : shownNow === built ? face : shownNow.face ?? null;
    const shown = () => shownNow == null
        ? null
        : shownNow === built
            ? { source: 'MakeHuman', body: human, built, recipe: null }
            : {
                source: shownNow.source,
                body: shownNow.body,
                built: shownNow,
                recipe: shownNow.recipe,
            };
    let choosing = 0;
    const choose = async () => {
        const token = ++choosing;
        const name = s.source;
        hideOther();
        problem = '';
        if (madeHuman()) {
            other = null;
            if (built) {
                await dress();
                show(built);
            }
            return;
        }
        built?.root.setEnabled(false);
        shownNow = null;
        if (!rigged.has(name)) {
            status(`rigging ${name}…`);
            await new Promise((r) => setTimeout(r, 50));
            try {
                rigged.set(name, await rig(name));
            }
            catch (e) {
                console.warn('character: could not rig', name, e);
                problem = `${name}: ${e?.message ?? e}`;
            }
            status(false);
        }
        if (token !== choosing || disposed)
            return;
        other = rigged.get(name) ?? null;
        if (!other) {
            options.handleShown?.(null);
            return;
        }
        dressOther();
        show(other);
    };
    // A body bound from a recipe that is no longer the character's is bound again.
    const rebind = () => {
        let again = false;
        for (const [name, r] of [...rigged]) {
            if (r.kept === JSON.stringify(recipeOf(name)))
                continue;
            if (r === other) {
                hideOther();
                other = null;
                again = s.source === name;
            }
            r.dispose();
            rigged.delete(name);
        }
        return again ? choose() : undefined;
    };
    /*
    CHANGES: each setting to what it touches.
    */
    const BODY = new Set(Object.keys(DEFAULT_HUMAN_BODY));
    const HAIR = new Set([
        'hair',
        'beard',
        'moustache',
        'brows',
        'hairUp',
        'hairForward',
        'hairSize',
    ]);
    const dressShown = () => (madeHuman() ? dress() : dressOther());
    const recolour = () => {
        for (const sh of shades)
            sh.setColours(s.hairBase, s.hairHighlight);
    };
    const set = (changes) => {
        const changed = Object.keys(changes).filter((k) => JSON.stringify(s[k]) !== JSON.stringify(changes[k]));
        if (!changed.length)
            return;
        for (const k of changed)
            s[k] = plain(changes[k]);
        const has = (k) => changed.includes(k);
        // Wearing something new: from its own colourway, a saved garment as saved.
        for (const slot of SLOTS)
            if (has(slot) && s[slot] !== 'none') {
                cloth[slot].look = 'as made';
                const saved = garments.get(s[slot])?.look;
                if (saved)
                    cloth[slot].material = lookRecipe(saved);
            }
        if (has('blink'))
            blinking();
        if (has('talk'))
            talking();
        if (['smile', 'browsUp', 'frown'].some(has))
            feel();
        if (has('iris'))
            eyes.setIris(s.iris);
        if (has('irisColour'))
            eyes.setIrisColour(s.irisColour);
        if (has('hairBase') || has('hairHighlight'))
            recolour();
        queue(async () => {
            if (changed.some((k) => BODY.has(k)))
                await rebuild();
            if (has('rigs'))
                await rebind();
            if (has('surfaces'))
                for (const r of rigged.values())
                    dressSurfaces(r);
            if (has('source'))
                await choose();
            else if (has('hideClothes') || SLOTS.some(has))
                await dressShown();
            else if (changed.some((k) => HAIR.has(k)))
                await dress();
            if (has('stubble') && stubbleMask == null && s.stubble > 0)
                await measureStubble();
            if (['tone', 'redness', 'stubble', 'hairBase'].some(has))
                paint();
        });
    };
    await rebuild();
    for (const bytes of options.garments ?? [])
        await addGarment(bytes).catch((e) => console.warn('character: a garment would not load', e));
    if (options.garments)
        await dress();
    if (!madeHuman())
        await choose();
    status(false);
    return {
        root,
        get settings() {
            return plain(s);
        },
        set,
        ready: () => work,
        cloth: (slot) => cloth[slot],
        setCloth(slot, look) {
            const was = cloth[slot].look;
            if (look.material)
                cloth[slot].material = plain(look.material);
            if (look.look != null)
                cloth[slot].look = look.look;
            if (cloth[slot].look !== was)
                queue(dressShown);
            else
                refabric();
        },
        choices: (key) => SLOTS.includes(key) && !madeHuman()
            ? [
                'none',
                ...[...garments.values()]
                    .filter((g) => g.source === s.source && g.slot === key)
                    .map((g) => g.name),
            ]
            : SLOTS.includes(key)
                ? styles[key].filter((n) => (garments.get(n)?.source ?? 'MakeHuman') === 'MakeHuman')
                : styles[key] ?? [],
        get shown() {
            return shown();
        },
        get skeleton() {
            return read;
        },
        get recipe() {
            return shownNow && shownNow !== built ? shownNow.recipe : null;
        },
        expressions,
        garments,
        async addGarment(bytes) {
            const g = await addGarment(bytes);
            return g;
        },
        forgetGarment(name) {
            const g = garments.get(name);
            if (!g)
                return;
            garments.delete(name);
            styles[g.slot] = styles[g.slot].filter((n) => n !== name);
        },
        sources,
        addSource(name, source) {
            sources[name] = source;
            // A file opened again: the copy loaded before, its materials with it.
            for (const sf of [
                ...(triangles.get(name)?.surfaces ?? []),
                ...(skinned.get(name)?.surfaces ?? []),
            ])
                sf.material?.dispose(false, true);
            triangles.delete(name);
            skinned.delete(name);
            const old = rigged.get(name);
            if (old) {
                if (old === other) {
                    hideOther();
                    other = null;
                }
                old.dispose();
                rigged.delete(name);
            }
            // The body on show, opened again: shown again from the new file.
            if (s.source === name)
                queue(choose);
        },
        adopt(name, made, recipe) {
            const old = rigged.get(name);
            if (old) {
                if (old === other) {
                    hideOther();
                    other = null;
                }
                old.dispose();
            }
            s.rigs = { ...plain(s.rigs ?? {}), [name]: plain(recipe) };
            rigged.set(name, wear(made, recipe, name));
            if (s.source === name)
                queue(choose);
        },
        hide(h) {
            hidden = h;
            shownNow?.root.setEnabled(!h);
        },
        surfaces() {
            const r = shownNow && shownNow !== built ? shownNow : null;
            // One per material, however many runs of triangles use it.
            const byName = new Map();
            for (const sf of r?.body.surfaces ?? [])
                if (sf.material)
                    byName.set(sf.name, sf);
            return [...byName.values()].map((sf) => ({
                name: sf.name,
                choice: surfaceChoice(r, sf),
            }));
        },
        redress: () => {
            queue(dressShown);
        },
        groundFor(clip) {
            clipLow = clip && shownNow ? measureClip(clip) : null;
            placeRoot();
            return body.position.y;
        },
        get problem() {
            return problem;
        },
        get human() {
            return { pack, positions: current };
        },
        dispose() {
            disposed = true;
            stopBlink?.();
            stopTalk?.();
            stopLids();
            stopGaze();
            for (const m of hairMeshes)
                m.dispose();
            face?.dispose();
            built?.dispose();
            for (const r of rigged.values())
                r.dispose();
            root.dispose();
        },
    };
    // How far below the body's root its soles reach while `group` plays.
    function measureClip(group) {
        const r = shownNow;
        const mesh = r.mesh;
        const nodes = r.root.getChildTransformNodes(false);
        // The soles only: a tail on a spring hangs anywhere while sampled.
        r.soles ??= soleVertices(r === built ? human : r.body);
        let low = Infinity;
        for (let k = 0; k < 24; k++) {
            group.goToFrame(group.from + ((group.to - group.from) * k) / 24);
            for (const n of nodes)
                n.computeWorldMatrix(true);
            r.skeleton.prepare(true);
            if (r.soles.length)
                low = Math.min(low, lowestOf(mesh, r.soles));
            else {
                mesh.refreshBoundingInfo({ applySkeleton: true, applyMorph: true });
                low = Math.min(low, mesh.getBoundingInfo().boundingBox.minimumWorld.y);
            }
        }
        group.goToFrame(group.from);
        return low - body.position.y - root.getAbsolutePosition().y;
    }
}
//# sourceMappingURL=character.js.map