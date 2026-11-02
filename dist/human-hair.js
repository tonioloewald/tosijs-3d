/*#
# human-hair

Hairstyles, beards and eyebrows from a library made for another head, worn
by a [character builder](/character-builder/) body. The library is
Quaternius' CC0 hairstyles (`quaternius/libraries/hairstyles.glb` on the
CDN: 19 adult styles, their teen versions and six pairs of eyebrows), each
modelled in place on Quaternius' base head.

`loadHairLibrary(scene, url)` reads the library once: each piece's vertices
in the file's own frame (right-handed, +Z forward, the frame a human pack
uses), its UVs, its triangles and its material, and the HEAD it was
modelled on (`Reference_Head`, Quaternius' Regular_Male). The placing is
engine-free, in [hair-place](/hair-place/) (which also reads the library
with no engine); this module loads it into Babylon. `headScalp(...)`
warps that head's skin onto a body's ([hair-fit](/hair-fit/)): a per-axis
fit, then each skin point's own correction, the scalp and the face
separately. `humanHair(...)` carries any piece through the warp, so every
hair keeps its height above the scalp under it, and hangs it on the Head
bone so it moves with the clip.

Fitting the hair itself to the skin does not work: a style is one outer
shell with no underside, so laid on the skin it sinks by its own thickness.

The library's hair texture is a neutral grey meant to be tinted, so
`hairMaterial` gives one material per colour from `hairColor`: black to
platinum, plus red.
*/
/*{ "parent": "character-builder", "order": 55 }*/
import * as BABYLON from '@babylonjs/core';
import { hairColor, hairDye } from './skin-tone.js';
import { vertexNormals } from './hair-fit.js';
import { closestHead, hairFitFor, moustacheLip, placeHair, QUATERNIUS_HEADS, withoutLashes, } from './hair-place.js';
export { headScalp, placeHair, QUATERNIUS_HEADS, } from './hair-place.js';
/** Load a hair library (a GLB of named pieces); `reference` hugs its scalp. */
export async function loadHairLibrary(scene, url, options = {}) {
    const container = await BABYLON.LoadAssetContainerAsync(url, scene);
    const root = container.meshes.find((m) => m.name === '__root__');
    const toFile = root
        ? BABYLON.Matrix.Invert(root.computeWorldMatrix(true))
        : BABYLON.Matrix.Identity();
    const pieces = new Map();
    for (const node of container.transformNodes.concat(container.meshes)) {
        if (node === root || node.parent !== root)
            continue;
        const extras = node.metadata?.gltf?.extras;
        const category = extras?.category ??
            (node.name.startsWith('Eyebrows') ? 'eyebrows' : 'hair');
        const parts = [];
        for (const m of [node, ...node.getChildMeshes(false)]) {
            if (!(m instanceof BABYLON.Mesh) || m.getTotalVertices() === 0)
                continue;
            // The mesh's own placement (some are in centimetres, turned upright),
            // in the file's frame: its world matrix less the root's mirror.
            const toWorld = m.computeWorldMatrix(true).multiply(toFile);
            const raw = m.getVerticesData(BABYLON.VertexBuffer.PositionKind);
            const positions = new Float32Array(raw.length);
            const v = new BABYLON.Vector3();
            for (let i = 0; i < raw.length; i += 3) {
                BABYLON.Vector3.TransformCoordinatesFromFloatsToRef(raw[i], raw[i + 1], raw[i + 2], toWorld, v);
                positions[i] = v.x;
                positions[i + 1] = v.y;
                positions[i + 2] = v.z;
            }
            const uv = m.getVerticesData(BABYLON.VertexBuffer.UVKind);
            parts.push({
                positions,
                uvs: uv ? new Float32Array(uv) : null,
                indices: Uint32Array.from(m.getIndices() ?? []),
                material: m.material,
            });
        }
        if (category === 'eyebrows') {
            for (const part of parts)
                part.indices = withoutLashes(part);
        }
        if (parts.length > 0)
            pieces.set(node.name, { category, parts });
    }
    const heads = [];
    for (const [name, landmarks] of Object.entries(options.heads ?? QUATERNIUS_HEADS)) {
        const head = pieces.get(name);
        if (head == null)
            continue;
        const part = head.parts[0];
        heads.push({
            name,
            skin: part.positions,
            normals: vertexNormals(part.positions, part.indices),
            landmarks,
        });
        pieces.delete(name);
    }
    if (heads.length === 0) {
        throw new Error('human-hair: the library has no reference head');
    }
    const chosen = new Map();
    const library = {
        names: (category) => [...pieces]
            .filter(([, p]) => category == null || p.category === category)
            .map(([n]) => n),
        piece: (name) => pieces.get(name)?.parts,
        heads,
        headFor(name) {
            let h = chosen.get(name);
            if (h == null) {
                h = closestHead(pieces.get(name)?.parts ?? [], heads);
                chosen.set(name, h);
            }
            return h;
        },
        fitFor: (name) => hairFitFor(name, pieces.get(name)?.category ?? 'hair'),
        materials: container.materials,
        dispose: () => container.dispose(),
    };
    // The moustache's lower edge marks its head's lip line.
    const m = pieces.get(options.moustache ?? 'Hair_Moustache')?.parts[0];
    const lip = m && moustacheLip(m);
    if (lip)
        library.headFor(options.moustache ?? 'Hair_Moustache').lip = lip;
    return library;
}
/*
The library's hair texture averages about this much (linear), so a colour is
divided by it to come out as itself.
*/
const HAIR_TEXTURE_MEAN = 0.42;
export function hairMaterial(scene, from, name = 'hair') {
    const m = (from instanceof BABYLON.PBRMaterial
        ? from.clone(name)
        : new BABYLON.PBRMaterial(name, scene));
    m.metallic = 0;
    m.backFaceCulling = false;
    // A highlight band along the strands (they run along the texture's V),
    // and a soft rim at grazing angles.
    m.roughness = 0.4;
    m.anisotropy.isEnabled = true;
    m.anisotropy.intensity = 0.8;
    m.anisotropy.direction.set(0, 1);
    m.sheen.isEnabled = true;
    m.sheen.intensity = 0.25;
    m.sheen.roughness = 0.4;
    m.setHair = (light, red = 0, dye) => {
        const natural = hairColor(light, red);
        const c = dye ? hairDye(natural, dye.hue, dye.saturation) : natural;
        const k = 1 / HAIR_TEXTURE_MEAN;
        m.albedoColor = new BABYLON.Color3(Math.min(1, c.r * k), Math.min(1, c.g * k), Math.min(1, c.b * k));
    };
    m.setHair(0.3);
    return m;
}
/**
 * Put a library piece on a built body: carried from the library's head to
 * this one, hung on its Head bone. One mesh per part of the piece.
 */
export function humanHair(scene, built, rig, scalp, parts, material, options) {
    const headName = options.bone ?? 'Head';
    const head = built.node(headName);
    const at = rig.at(headName);
    if (head == null || at == null) {
        throw new Error(`human-hair: the rig has no ${headName}`);
    }
    return parts.map((part, i) => {
        const p = placeHair(scalp, part, options);
        for (let v = 0; v < p.length; v += 3) {
            p[v] -= at.x;
            p[v + 1] -= at.y;
            p[v + 2] -= at.z;
        }
        const mesh = new BABYLON.Mesh(`${options.name ?? 'hair'}-${i}`, scene);
        const data = new BABYLON.VertexData();
        data.positions = p;
        data.indices = Array.from(part.indices);
        if (part.uvs)
            data.uvs = part.uvs;
        const normals = [];
        // Counter-clockwise, outward: the file's handedness, under the rig's mirror.
        BABYLON.VertexData.ComputeNormals(p, data.indices, normals, {
            useRightHandedSystem: true,
        });
        data.normals = normals;
        data.applyToMesh(mesh);
        mesh.sideOrientation = BABYLON.Material.ClockWiseSideOrientation;
        mesh.material = material(part);
        mesh.parent = head;
        return mesh;
    });
}
//# sourceMappingURL=human-hair.js.map