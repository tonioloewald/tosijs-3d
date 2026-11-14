/*#
# body export

**A rigged body out as a GLB, from a panel.** The rows the rig tool and the
character builder put in their **Export** section: which joint names, which
rest pose, how tall, and a button that writes the body shown with
[rigged-body-glb](/rigged-body-glb/) (its springs too, from the rig recipe)
and downloads it. The file plays UAL's clips by name in three.js, Unity,
Godot and Blender; a tail or a strand swings in any VRM loader. With
**animation** set to the clip playing, that clip goes in too, retargeted onto
the skeleton as written (from UAL's file, a GLB's animations or a BVH
capture: `clip` on the target says which).

The body on screen was read through Babylon, so its materials are Babylon's.
For the file, the model it came from is read again from its bytes
([glb-rig](/glb-rig/)), and its materials go out as glTF with their
pictures. A model that is not a GLB (an OBJ) goes out in plain grey.

```javascript
import { exportBodyRows } from 'tosijs-3d/body-export'
panel.push(...exportBodyRows(() => ({ body, recipe, source: { url } }), say))
```
*/
/*{ "parent": "rigged-body-glb", "order": 2 }*/
import { button3d, label3d, select3d } from './widgets3d.js';
import { glbNodePosition, glbRigTriangles } from './glb-rig.js';
import { riggedBodyGlb, } from './rigged-body-glb.js';
import { readGlbClips } from './glb-clips.js';
import { readBvh } from './bvh.js';
import { bakeClothLook } from './cloth-bake.js';
const HEIGHTS = [
    'as made',
    '1.5 m',
    '1.6 m',
    '1.7 m',
    '1.8 m',
    '1.9 m',
    '2.0 m',
];
async function sourceBytes(source) {
    if (source == null)
        return null;
    const buffer = source.file != null
        ? await source.file.arrayBuffer()
        : source.url
            ? await (await fetch(source.url)).arrayBuffer()
            : null;
    return buffer != null ? new Uint8Array(buffer) : null;
}
// A clip library (UAL's is megabytes) is read once a page.
const clipSources = new Map();
/** A clip from its file, as riggedBodyGlb's `clips` takes it (null: not in the file). */
export async function exportClip(c) {
    const read = async () => {
        const bytes = c.bytes ?? new Uint8Array(await (await fetch(c.url)).arrayBuffer());
        return c.kind === 'bvh'
            ? readBvh(new TextDecoder().decode(bytes), { name: c.name })
            : readGlbClips(bytes);
    };
    let from;
    if (c.url != null && c.bytes == null) {
        if (!clipSources.has(c.url))
            clipSources.set(c.url, read());
        from = await clipSources.get(c.url).catch((e) => {
            clipSources.delete(c.url);
            throw e;
        });
    }
    else
        from = await read();
    const clip = c.kind === 'bvh' ? from.clips[0] : from.clips.find((k) => k.name === c.name);
    if (clip == null)
        return null;
    return {
        from,
        clip,
        name: c.name,
        ...(c.armSpaceDeg ? { armSpaceDeg: c.armSpaceDeg } : {}),
        ...(c.footTurnDeg ? { footTurnDeg: c.footTurnDeg } : {}),
        ...(c.extras ? { extras: c.extras } : {}),
    };
}
/**
 * The body as GLB bytes, with the model's own materials where its file is a
 * GLB of the same mesh. `note` says what was left out.
 */
export async function exportBody(target, settings) {
    let body = target.body;
    let note = '';
    const bytes = await sourceBytes(target.source).catch(() => null);
    // Not a GLB (an OBJ, a glTF with its buffers elsewhere): the reader says so.
    const tris = (() => {
        try {
            return bytes != null
                ? glbRigTriangles(bytes, { pick: target.source?.pick })
                : null;
        }
        catch {
            return null;
        }
    })();
    if (tris != null &&
        tris.indices.length === body.indices.length &&
        tris.surfaces)
        body = { ...body, surfaces: tris.surfaces };
    else if (tris != null)
        note = 'its materials did not match the mesh: plain grey';
    else if (target.body.surfaces?.length &&
        !target.body.surfaces.some((s) => Array.isArray(s.material?.baseColorFactor)))
        // A body that brings its own glTF materials (MakeHuman's skin) keeps them.
        note = 'not from a GLB: plain grey';
    const held = target.held
        ? await heldItem(target.held).catch(() => {
            note = [
                note,
                `the ${target.held.model} could not be read: hand socket only`,
            ]
                .filter(Boolean)
                .join('; ');
            return { grip: target.held.grip };
        })
        : undefined;
    const clip = settings.animation === 'playing' && target.clip
        ? await exportClip(target.clip).catch(() => null)
        : null;
    if (settings.animation === 'playing' && clip == null)
        note = [note, 'no clip to put in'].filter(Boolean).join('; ');
    const out = riggedBodyGlb(body, {
        ...(held ? { held } : {}),
        ...(clip ? { clips: [clip] } : {}),
        ...(target.eyeTexture ? { eyeTexture: target.eyeTexture } : {}),
        ...(target.garments?.length
            ? { garments: target.garments, bake: bakeClothLook }
            : {}),
        naming: settings.naming,
        restPose: settings.restPose,
        ...(settings.height > 0 ? { height: settings.height } : {}),
        ...(target.recipe ? { recipe: target.recipe } : {}),
        generator: 'tosijs-3d',
    });
    return { bytes: out, note };
}
/** A library model as riggedBodyGlb's `held`: its mesh and grip point, read from its file. */
async function heldItem(h) {
    const bytes = new Uint8Array(await (await fetch(h.url)).arrayBuffer());
    const pick = h.model;
    return {
        grip: h.grip,
        item: glbRigTriangles(bytes, { pick }),
        gripPoint: (h.gripNode && glbNodePosition(bytes, h.gripNode, { pick })) || undefined,
        ...(h.extras ? { extras: h.extras } : {}),
    };
}
/** Save bytes as a file. */
export function downloadBytes(name, bytes, type = 'model/gltf-binary') {
    const url = URL.createObjectURL(new Blob([bytes], { type }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const settings = {
    naming: 'ue',
    restPose: 't-pose',
    height: 0,
    animation: 'none',
};
/**
 * An Export section: names, rest pose, height and the button. `target`
 * gives what to write when pressed (null: nothing to export, and why);
 * `say` reports what happened.
 */
export function exportBodyRows(target, say) {
    return [
        label3d({ text: 'Export', icon: 'download', collapsible: true }),
        select3d({
            label: 'joint names',
            value: settings.naming === 'ue' ? 'UE (UAL)' : 'Mixamo',
            options: ['UE (UAL)', 'Mixamo'],
            handleChange: (v) => {
                settings.naming = v === 'Mixamo' ? 'mixamo' : 'ue';
            },
        }),
        select3d({
            label: 'rest pose',
            value: settings.restPose === 't-pose' ? 'T-pose' : 'as rigged',
            options: ['T-pose', 'as rigged'],
            handleChange: (v) => {
                settings.restPose = v === 'T-pose' ? 't-pose' : 'source';
            },
        }),
        select3d({
            label: 'height',
            value: settings.height > 0 ? `${settings.height.toFixed(1)} m` : 'as made',
            options: HEIGHTS,
            handleChange: (v) => {
                settings.height = v === 'as made' ? 0 : parseFloat(String(v));
            },
        }),
        select3d({
            label: 'animation',
            value: settings.animation === 'playing' ? 'the clip playing' : 'none',
            options: ['none', 'the clip playing'],
            handleChange: (v) => {
                settings.animation = v === 'none' ? 'none' : 'playing';
            },
        }),
        button3d({
            label: 'export GLB',
            handleClick: () => {
                void (async () => {
                    const t = await target();
                    if (typeof t === 'string') {
                        say(t);
                        return;
                    }
                    say(`exporting ${t.name}…`);
                    try {
                        const { bytes, note } = await exportBody(t, settings);
                        downloadBytes(`${t.name}.glb`, bytes);
                        say(`exported ${t.name}.glb (${(bytes.byteLength / 1e6).toFixed(1)} MB)${note ? `; ${note}` : ''}`);
                    }
                    catch (e) {
                        say(`could not export: ${e.message}`);
                    }
                })();
            },
        }),
    ];
}
//# sourceMappingURL=body-export.js.map