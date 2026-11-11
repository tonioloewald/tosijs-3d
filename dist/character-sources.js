/*#
# character sources

**The bodies a character can have besides MakeHuman's**, as data: where each
mesh is on the asset CDN, which node to take, and for Tonio's AI-made cast
(CC0, `tonio/ai`) the rig he placed by hand in the [rig tool](/rig-tool/):
the front markers, joints moved after the fit, and how much hand to rig (the
spacesuits' gloves are mittens). Engine-free, so an exporter or another engine
rigs the cast the way the [character builder](/character-builder/) does:

```javascript
import { AI_CHARACTER_SOURCES } from 'tosijs-3d/character-sources'
import { glbRigTriangles } from 'tosijs-3d/glb-rig'
import { bodyFromMarkers } from 'tosijs-3d/rigged-body'
import { riggedBodyGlb } from 'tosijs-3d/rigged-body-glb'

const source = AI_CHARACTER_SOURCES['eurasian-male-spacesuit']
const bytes = new Uint8Array(await (await fetch(source.url)).arrayBuffer())
const body = bodyFromMarkers(glbRigTriangles(bytes, { pick: source.pick }), source.recipe.binding)
const glb = riggedBodyGlb(body, { recipe: source.recipe })
```

A source's `url` is read when it is used, under the asset base
(`assetUrl`), so set the base first. `rigFromMarkers` is how a hand-placed rig
is written down: the left side, mirrored to the right.

Pure: no DOM, no Babylon.
*/
/*{ "parent": "character" }*/
import { assetUrl } from './asset-url.js';
// A hosted body: its URL is read when it is used, after the page has set
// the asset base (computed at import, it came out relative to the page).
const hosted = (path, pick, recipe) => ({
    get url() {
        return assetUrl(path);
    },
    ...(pick != null ? { pick } : {}),
    ...(recipe != null ? { recipe } : {}),
});
/**
 * A rig placed by hand in the rig tool, as a body's default: the five front
 * markers on the left (chin, groin, wrist, elbow, knee; mirrored to the
 * right) and any joints moved by hand, also on the left and mirrored, and
 * any on the centre line (a neck) as they are; `hands` how much hand is
 * rigged (a glove is a mitten: its thumb and middle finger are enough);
 * `depths` metres in front of the fit's depth for a marker's joint (negative
 * behind; the groin's is the pelvis), the wrist, elbow and knee for both sides.
 */
export function rigFromMarkers([chin, groin, wrist, elbow, knee], joints = {}, centre = {}, hands, depths = {}) {
    const at = ([x, y], s = 1) => ({ x: x * s, y });
    const moved = {};
    for (const [name, [x, y, z]] of Object.entries(centre))
        moved[name] = { x, y, z };
    for (const [name, [x, y, z]] of Object.entries(joints)) {
        moved[`${name}_l`] = { x, y, z };
        moved[`${name}_r`] = { x: -x, y, z };
    }
    return {
        binding: {
            markers: {
                chin: at(chin),
                groin: at(groin),
                wristL: at(wrist),
                wristR: at(wrist, -1),
                elbowL: at(elbow),
                elbowR: at(elbow, -1),
                kneeL: at(knee),
                kneeR: at(knee, -1),
            },
            tail: null,
            joints: moved,
            ...(hands != null ? { hands } : {}),
            ...(Object.keys(depths).length
                ? {
                    depths: Object.fromEntries(Object.entries(depths).flatMap(([k, v]) => k === 'chin' || k === 'groin'
                        ? [[k, v]]
                        : [
                            [`${k}L`, v],
                            [`${k}R`, v],
                        ])),
                }
                : {}),
        },
    };
}
/**
 * Tonio's AI-generated characters (CC0, `tonio/ai` on the asset CDN): one
 * mesh each, unrigged, rigged from markers placed by hand where a recipe is
 * given here, else guessed off their outline.
 */
export const AI_CHARACTER_SOURCES = {
    'african-american-female': hosted('tonio/ai/african-american-female-10k.glb', undefined, rigFromMarkers([
        [0, 0.6107],
        [0, -0.1016],
        [0.4565, 0.0243],
        [0.3338, 0.206],
        [0.1177, -0.4334],
    ], {
        thumb_01: [0.4798, 0.0089, 0.071],
        thumb_02: [0.4555, -0.0154, 0.0883],
        thumb_03: [0.4558, -0.039, 0.0986],
        thumb_04_leaf: [0.4571, -0.0542, 0.1083],
        index_01: [0.5017, -0.0296, 0.0698],
        index_02: [0.512, -0.0638, 0.0728],
        index_03: [0.5174, -0.0871, 0.0746],
        index_04_leaf: [0.5246, -0.1041, 0.0767],
        middle_03: [0.5227, -0.0987, 0.054],
        middle_04_leaf: [0.5309, -0.1203, 0.0561],
        ring_03: [0.5211, -0.0936, 0.0299],
        ring_04_leaf: [0.5271, -0.1136, 0.0316],
    })),
    'african-american-female-spacesuit': hosted('tonio/ai/african-american-female-spacesuit-10k.glb', undefined, rigFromMarkers([
        [0, 0.5879],
        [0, -0.22],
        [0.4761, 0.0743],
        [0.3273, 0.2678],
        [0.1397, -0.5268],
    ], {
        clavicle: [0.0297, 0.4345, 0.0038],
        upperarm: [0.1958, 0.4719, -0.0164],
        thumb_01: [0.4756, 0.0702, 0.1598],
        thumb_02: [0.476, 0.0518, 0.1852],
        thumb_03: [0.4773, 0.0269, 0.2042],
        thumb_04_leaf: [0.4775, 0.0037, 0.2148],
        middle_01: [0.5366, 0.0429, 0.1344],
        middle_02: [0.549, 0.005, 0.1591],
        middle_03: [0.551, -0.0291, 0.17],
        middle_04_leaf: [0.5501, -0.059, 0.1792],
    }, { neck_01: [0.0011, 0.4738, 0.0212] }, 'mitten')),
    'eurasian-male': hosted('tonio/ai/eurasian-male-10k.glb', undefined, rigFromMarkers([
        [0, 0.6324],
        [0, -0.1614],
        [0.5217, 0.105],
        [0.3631, 0.2801],
        [0.1217, -0.4337],
    ], {
        thumb_01: [0.5421, 0.0598, 0.0834],
        thumb_02: [0.5399, 0.0357, 0.0961],
        thumb_03: [0.5407, 0.0149, 0.105],
        thumb_04_leaf: [0.5397, 0.0033, 0.1169],
    })),
    'eurasian-male-spacesuit': hosted('tonio/ai/eurasian-male-spacesuit-10k.glb', undefined, {
        armSpaceDeg: -1,
        ...rigFromMarkers([
            [0, 0.5937],
            [0, -0.2082],
            [0.4971, 0.0854],
            [0.3628, 0.2618],
            [0.1484, -0.5198],
        ], {
            thumb_01: [0.4974, 0.0666, 0.1361],
            thumb_02: [0.4914, 0.0479, 0.157],
            thumb_03: [0.4871, 0.028, 0.1682],
            thumb_04_leaf: [0.4866, 0.0039, 0.1737],
            middle_01: [0.5402, 0.0395, 0.0991],
            middle_02: [0.55, 0.0002, 0.1135],
            middle_03: [0.5571, -0.0295, 0.1183],
            middle_04_leaf: [0.5586, -0.0559, 0.1235],
        }, {}, 'mitten'),
    }),
};
/** The bodies a character can have besides MakeHuman's. */
export const CHARACTER_SOURCES = {
    ...AI_CHARACTER_SOURCES,
    'Blender: female, realistic': hosted('blender/human-base-meshes/body-female-realistic.glb'),
    'Blender: male, realistic': hosted('blender/human-base-meshes/body-male-realistic.glb'),
    'Quaternius: superhero, male': hosted('quaternius/libraries/characters-superhero-male.glb', 'Superhero_Male_FullBody'),
    'Quaternius: superhero, female': hosted('quaternius/libraries/characters-superhero-female.glb', 'Superhero_Female_FullBody'),
};
//# sourceMappingURL=character-sources.js.map