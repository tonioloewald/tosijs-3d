/*#
# human-hair

Hairstyles, beards and eyebrows from a library made for another head, worn
by a [character builder](/character-builder/) body. The library is
Quaternius' CC0 hairstyles (`quaternius/libraries/hairstyles.glb` on the
CDN: 19 adult styles, their teen versions and six pairs of eyebrows), each
modelled in place on Quaternius' base head.

`loadHairLibrary(scene, url)` reads the library once: each piece's vertices
in the file's own frame (right-handed, +Z forward, the frame a human pack
uses), its UVs, its triangles and its material. `headScalp(...)` measures a
body's head and fits the library's buzz cut onto its scalp
([hair-fit](/hair-fit/)), and `humanHair(...)` puts any piece on that head
through the same fit, pushed out of the skin wherever the shapes differ, and
hangs it on the Head bone so it moves with the clip.

The library's hair texture is a neutral grey meant to be tinted, so
`hairMaterial` gives one material per colour from `hairColor`: black to
platinum, plus red.
*/
/*{ "parent": "character-builder", "order": 55 }*/
import * as BABYLON from '@babylonjs/core';
import { humanJoint } from './human-morph.js';
import { hairColor } from './skin-tone.js';
import { applyFit, conformOutside, fitToScalp, vertexNormals, } from './hair-fit.js';
/*
Quaternius' eyebrow pieces carry their own upper eyelashes: a strip under
each brow, at ITS head's eyes. A body that has its own lashes would wear two
pairs (the lower one reading as a second, thinner pair of brows once the brow
is placed for this face), so the strips are dropped: the islands of the piece
whose top is in the lower half of the range the islands' tops span.
*/
function withoutLashes(part) {
    const p = part.positions;
    const n = p.length / 3;
    const parent = Int32Array.from({ length: n }, (_, i) => i);
    const find = (x) => {
        while (parent[x] !== x)
            x = parent[x] = parent[parent[x]];
        return x;
    };
    const join = (a, b) => {
        parent[find(a)] = find(b);
    };
    const ix = part.indices;
    for (let t = 0; t < ix.length; t += 3) {
        join(ix[t], ix[t + 1]);
        join(ix[t], ix[t + 2]);
    }
    // Split vertices (a UV seam) are one island.
    const at = new Map();
    for (let v = 0; v < n; v++) {
        const k = `${p[v * 3].toFixed(4)},${p[v * 3 + 1].toFixed(4)},${p[v * 3 + 2].toFixed(4)}`;
        const w = at.get(k);
        if (w == null)
            at.set(k, v);
        else
            join(v, w);
    }
    const top = new Map();
    for (let v = 0; v < n; v++) {
        const r = find(v);
        top.set(r, Math.max(top.get(r) ?? -Infinity, p[v * 3 + 1]));
    }
    const tops = [...top.values()];
    const cut = (Math.min(...tops) + Math.max(...tops)) / 2;
    if (Math.max(...tops) - Math.min(...tops) < 1e-4)
        return ix;
    const keep = [];
    for (let t = 0; t < ix.length; t += 3) {
        if (top.get(find(ix[t])) > cut)
            keep.push(ix[t], ix[t + 1], ix[t + 2]);
    }
    return Uint32Array.from(keep);
}
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
    const ref = pieces.get(options.reference ?? 'Hair_Buzzed');
    if (ref == null)
        throw new Error('human-hair: the library has no reference style');
    return {
        names: (category) => [...pieces]
            .filter(([, p]) => category == null || p.category === category)
            .map(([n]) => n),
        piece: (name) => pieces.get(name)?.parts,
        reference: ref.parts[0].positions,
        materials: container.materials,
        dispose: () => container.dispose(),
    };
}
/**
 * Measure a morphed body's head (`positions` every pack vertex, `triangles`
 * the body's) and fit `reference` onto its scalp. The head is found from the
 * eyes, so it works at any size.
 */
export function headScalp(manifest, positions, triangles, reference) {
    const [lx, ly, lz] = humanJoint(positions, manifest.joints['eye.L____head']);
    const [rx] = humanJoint(positions, manifest.joints['eye.R____head']);
    const e = Math.abs(lx - rx);
    const mid = (lx + rx) / 2;
    const normals = vertexNormals(positions, triangles);
    const used = new Uint8Array(positions.length / 3);
    for (let i = 0; i < triangles.length; i++)
        used[triangles[i]] = 1;
    const skin = [];
    const skinN = [];
    const top = [];
    for (let v = 0; v < used.length; v++) {
        if (!used[v])
            continue;
        const x = positions[v * 3];
        const y = positions[v * 3 + 1];
        // From the chin up, and no wider than the ears.
        if (y < ly - 2.2 * e || Math.abs(x - mid) > 1.6 * e)
            continue;
        skin.push(x, y, positions[v * 3 + 2]);
        skinN.push(normals[v * 3], normals[v * 3 + 1], normals[v * 3 + 2]);
        // The scalp the reference hugs: above the brow, and down to the nape
        // and the ears behind the face (a buzz cut covers both).
        const z = positions[v * 3 + 2];
        if (y > ly + 0.3 * e || (y > ly - 1.6 * e && z < lz - 0.6 * e)) {
            top.push(x, y, z);
        }
    }
    return {
        skin: Float32Array.from(skin),
        normals: Float32Array.from(skinN),
        fit: fitToScalp(reference, top),
        // About 2.5 cm above the eyeballs' centres on an adult (e ≈ 6.2 cm).
        brow: ly + 0.4 * e,
    };
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
    m.setHair = (light, red = 0) => {
        const c = hairColor(light, red);
        const k = 1 / HAIR_TEXTURE_MEAN;
        m.albedoColor = new BABYLON.Color3(Math.min(1, c.r * k), Math.min(1, c.g * k), Math.min(1, c.b * k));
    };
    m.setHair(0.3);
    return m;
}
/**
 * Put a library piece on a built body: fitted to its scalp, out of its skin
 * by `margin` metres, hung on its Head bone. One mesh per part of the piece.
 */
export function humanHair(scene, built, rig, scalp, parts, material, options = {}) {
    const headName = options.head ?? 'Head';
    const head = built.node(headName);
    const at = rig.at(headName);
    if (head == null || at == null) {
        throw new Error(`human-hair: the rig has no ${headName}`);
    }
    return parts.map((part, i) => {
        const p = applyFit(part.positions, scalp.fit);
        if (options.centreY != null) {
            let lo = Infinity;
            let hi = -Infinity;
            // Only what is drawn (a piece may carry vertices no triangle uses).
            for (const v of part.indices) {
                lo = Math.min(lo, p[v * 3 + 1]);
                hi = Math.max(hi, p[v * 3 + 1]);
            }
            const dy = options.centreY - (lo + hi) / 2;
            for (let v = 1; v < p.length; v += 3)
                p[v] += dy;
        }
        conformOutside(p, scalp.skin, scalp.normals, options.margin ?? 0.003);
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