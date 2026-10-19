/*
THE BABYLON SIDE OF RETARGETING (see `retarget`): read a loaded character's
skeleton into the pure form, and turn another rig's AnimationGroup into one
that drives this character's bones.

Rest poses are read from the skin's REST matrices, and the bones at the top
are measured against the model's root rather than their own parent node:
an exporter often hangs the skeleton under an armature node with its own
rotation (Mixamo through Blender does), and two rigs only agree about "up"
and "forward" once that is included.
*/
import * as BABYLON from '@babylonjs/core';
import { humanoidRoles, retargeter, } from './retarget.js';
const q = (r) => ({ x: r.x, y: r.y, z: r.z, w: r.w });
const v = (p) => ({ x: p.x, y: p.y, z: p.z });
const toB = (r) => new BABYLON.Quaternion(r.x, r.y, r.z, r.w);
/**
 * Read `skeleton` (a loaded skin's) as `retarget` needs it, with rest poses
 * measured from `root` (the model's top node, e.g. glTF's `__root__`).
 * `overrides` corrects a role the names got wrong.
 */
export function readSkeleton(skeleton, root, overrides = {}) {
    const rootInv = root.computeWorldMatrix(true).clone().invert();
    const nodes = new Map();
    const above = new Map();
    const aboveMatrix = new Map();
    const bones = [];
    // Each bone's rest as a full matrix (scale included), for addEnds.
    const restOf = new Map();
    const scale = new BABYLON.Vector3();
    const rot = new BABYLON.Quaternion();
    const pos = new BABYLON.Vector3();
    for (const bone of skeleton.bones) {
        const node = bone.getTransformNode();
        const name = node?.name ?? bone.name;
        if (node != null)
            nodes.set(name, node);
        const parentBone = bone.getParent();
        const parent = parentBone
            ? parentBone.getTransformNode()?.name ?? parentBone.name
            : null;
        let rest = bone.getRestMatrix().clone();
        if (parentBone == null) {
            // A top bone: include everything between the model root and it.
            const parentNode = node?.parent ?? null;
            if (parentNode != null) {
                const toParent = parentNode.computeWorldMatrix(true).multiply(rootInv);
                toParent.decompose(scale, rot, pos);
                above.set(name, q(rot));
                aboveMatrix.set(name, toParent.clone());
                rest = rest.multiply(toParent);
            }
        }
        restOf.set(bone, rest);
        rest.decompose(scale, rot, pos);
        bones.push({ name, parent, rotation: q(rot), position: v(pos) });
    }
    /*
    ONE UNIT THROUGHOUT. An armature above the skeleton can SCALE as well as
    turn (Mixamo through Blender: centimetres under a 0.01): the top bone's
    rest took that in, but its descendants' offsets stayed in centimetres, so
    omnidude's feet were 40 m below its 0.42 m hips and its hip height read
    41 m (a hip-travel scale of 46, not 0.45). Every bone below a scaled top
    bone is put in the model root's units.
    */
    const byName = new Map(bones.map((b) => [b.name, b]));
    const topOf = (b) => {
        let at = b;
        for (let i = 0; i < 512 && at.parent != null; i++) {
            const p = byName.get(at.parent);
            if (p == null)
                break;
            at = p;
        }
        return at;
    };
    const unit = new Map();
    for (const [name, m] of aboveMatrix) {
        m.decompose(scale, rot, pos);
        unit.set(name, Math.abs(scale.x));
    }
    for (const b of bones) {
        if (b.parent == null)
            continue;
        const k = unit.get(topOf(b).name);
        if (k == null || Math.abs(k - 1) < 1e-9)
            continue;
        b.position = {
            x: b.position.x * k,
            y: b.position.y * k,
            z: b.position.z * k,
        };
    }
    addEnds(skeleton, bones, restOf);
    return {
        bones,
        roles: humanoidRoles(bones, overrides),
        nodes,
        above,
        aboveMatrix,
    };
}
/*
WHERE A BONE POINTS WHEN NOTHING HANGS BELOW IT: the middle of the vertices
it drives most. A Kenney chibi's arm is one bone with no hand, so only its
flesh says the arm hangs down; without this, it took only the source's turn
since rest, and UAL's rest is not a standing pose (the chibi walked like a
crab). Measured in the model root's space, as the rest is.

A vertex is taken into its bone's own frame by the bone's inverse bind
matrix, then up the REST chain to the model root, exactly as the bones are.
Going through the mesh's world matrix instead is wrong under a scaled
armature (Mixamo through Blender, a 0.01): omnidude's ends all landed about
a centimetre from the origin, below the head, so the head was aimed at its
own feet and every clip played it upside down.
*/
function addEnds(skeleton, bones, restOf) {
    const scene = skeleton.getScene();
    // Each bone's rest in the model root's space, parents first.
    const toRoot = new Map();
    const rootOf = (bone) => {
        let m = toRoot.get(bone);
        if (m != null)
            return m;
        const local = restOf.get(bone) ?? BABYLON.Matrix.Identity();
        const parent = bone.getParent();
        m = parent != null ? local.multiply(rootOf(parent)) : local;
        toRoot.set(bone, m);
        return m;
    };
    // Vertex → bone frame → model root, by the index the mesh uses.
    const byIndex = new Map();
    skeleton.bones.forEach((bone, i) => byIndex.set(bone.getIndex(), {
        i,
        m: bone.getAbsoluteInverseBindMatrix().multiply(rootOf(bone)),
    }));
    const sum = bones.map(() => ({ x: 0, y: 0, z: 0, n: 0 }));
    const p = new BABYLON.Vector3();
    for (const mesh of scene.meshes) {
        if (mesh.skeleton !== skeleton)
            continue;
        const pos = mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);
        const idx = mesh.getVerticesData(BABYLON.VertexBuffer.MatricesIndicesKind);
        const wts = mesh.getVerticesData(BABYLON.VertexBuffer.MatricesWeightsKind);
        if (pos == null || idx == null || wts == null)
            continue;
        for (let i = 0; i < pos.length / 3; i++) {
            let best = -1;
            let bw = 0;
            for (let k = 0; k < 4; k++) {
                const w = wts[i * 4 + k];
                if (w > bw) {
                    bw = w;
                    best = idx[i * 4 + k];
                }
            }
            const b = byIndex.get(best);
            if (b == null)
                continue;
            BABYLON.Vector3.TransformCoordinatesFromFloatsToRef(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2], b.m, p);
            const s = sum[b.i];
            s.x += p.x;
            s.y += p.y;
            s.z += p.z;
            s.n++;
        }
    }
    for (let i = 0; i < bones.length; i++) {
        const s = sum[i];
        if (s.n > 0)
            bones[i].end = { x: s.x / s.n, y: s.y / s.n, z: s.z / s.n };
    }
}
const IDENT = { x: 0, y: 0, z: 0, w: 1 };
const mul = (a, b) => ({
    w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
    x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
    y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
    z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
});
const conj = (a) => ({ x: -a.x, y: -a.y, z: -a.z, w: a.w });
/**
 * Turn `group` (animating `source`'s bones) into a new AnimationGroup that
 * drives `target`'s bones the same way, sampled at `fps`. Bones the two
 * rigs do not share (fingers on a rig without them) are left at rest.
 */
export function retargetClip(group, source, target, options = {}) {
    const rt = retargeter(source, target, { armSpaceDeg: options.armSpaceDeg });
    const fps = options.fps ?? 30;
    // What animates each source bone, by name.
    const rotAnim = new Map();
    const posAnim = new Map();
    let rate = 60;
    for (const ta of group.targetedAnimations) {
        const name = ta.target?.name;
        if (name == null)
            continue;
        rate = ta.animation.framePerSecond || rate;
        if (ta.animation.targetProperty === 'rotationQuaternion')
            rotAnim.set(name, ta.animation);
        else if (ta.animation.targetProperty === 'position')
            posAnim.set(name, ta.animation);
    }
    const from = group.from;
    const to = group.to;
    const seconds = Math.max(0, (to - from) / rate);
    const frames = Math.max(1, Math.round(seconds * fps));
    const moving = rt.roles.map((r) => target.roles[r]);
    const keys = new Map(moving.map((n) => [n, []]));
    const hipsKeys = [];
    const sHips = source.roles.hips;
    const tHips = target.roles.hips;
    for (let i = 0; i <= frames; i++) {
        const at = from + (i / frames) * (to - from);
        const rotations = new Map();
        for (const [name, anim] of rotAnim) {
            const value = anim.evaluate(at);
            let local = q(value);
            // A top bone's keys are relative to its node parent: bring them to
            // the model root, as its rest is.
            const a = source.above.get(name);
            if (a != null)
                local = mul(a, local);
            rotations.set(name, local);
        }
        let hips;
        if (sHips != null) {
            const anim = posAnim.get(sHips);
            if (anim != null) {
                // A top bone's keys are in its parent node's space: to the model's.
                const key = anim.evaluate(at);
                const m = source.aboveMatrix.get(sHips);
                hips = v(m != null ? BABYLON.Vector3.TransformCoordinates(key, m) : key);
            }
        }
        const out = rt.pose(rotations, hips);
        for (const name of moving) {
            let local = out.rotations.get(name);
            if (local == null)
                continue;
            const a = target.above.get(name);
            if (a != null)
                local = mul(conj(a), local);
            keys.get(name).push({ frame: i, value: toB(local) });
        }
        if (out.hips != null && tHips != null) {
            let p = new BABYLON.Vector3(out.hips.x, out.hips.y, out.hips.z);
            // And a top bone's back into its parent node's space.
            const m = target.aboveMatrix.get(tHips);
            if (m != null)
                p = BABYLON.Vector3.TransformCoordinates(p, m.clone().invert());
            hipsKeys.push({ frame: i, value: p });
        }
    }
    const made = new BABYLON.AnimationGroup(options.name ?? `${group.name}→retargeted`, options.scene);
    for (const name of moving) {
        const node = target.nodes.get(name);
        const k = keys.get(name);
        if (node == null || k.length === 0)
            continue;
        node.rotationQuaternion ??= toB(IDENT);
        const anim = new BABYLON.Animation(`${name}.rotation`, 'rotationQuaternion', fps, BABYLON.Animation.ANIMATIONTYPE_QUATERNION, BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE);
        anim.setKeys(k);
        made.addTargetedAnimation(anim, node);
    }
    if (tHips != null && hipsKeys.length > 0) {
        const node = target.nodes.get(tHips);
        if (node != null) {
            const anim = new BABYLON.Animation(`${tHips}.position`, 'position', fps, BABYLON.Animation.ANIMATIONTYPE_VECTOR3, BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE);
            anim.setKeys(hipsKeys);
            made.addTargetedAnimation(anim, node);
        }
    }
    return made;
}
/** `retargetClip` for several groups, each named after its source. */
export function retargetClips(groups, source, target, options = {}) {
    return groups.map((g) => retargetClip(g, source, target, { ...options, name: g.name }));
}
//# sourceMappingURL=retarget-babylon.js.map