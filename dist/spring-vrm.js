/*#
# spring-vrm

**Our spring chains as glTF: `VRMC_springBone`, plus our own record of
them.** A rigged body's springs (a tail, a ponytail, a strand hung from a
bone) go out in the standard every VRM loader reads (three-vrm's
`VRMSpringBoneLoaderPlugin`, UniVRM, Godot's VRM importer), so they swing
in those engines with no setup. Beside it goes `TOSIJS_spring_chains`, which
holds the springs exactly as our model has them, so a file read back here
swings as it did when it was made. `riggedBodyGlb` writes both (pass it the
rig recipe); this module is the conversion and the schema, pure.

## Where the two models differ

Our chain (`spring-chain`) is Verlet at a fixed 120 Hz: velocity kept at
`1 - damping` per second, gravity an acceleration, and each point PULLED
toward its rest place by a fraction that grows with `stiffness`, so the
restoring force grows with how far it is out. VRM's (three-vrm's
`VRMSpringBoneJoint.update`, once a frame) adds the last frame's movement
times `1 - dragForce`, then `stiffness × dt` metres along the bone's rest
axis and `gravityPower × dt` metres along `gravityDir`, then keeps the
length. So:

- **Drag** is per FRAME there, per second here: `dragForce = 1 - (1 -
  damping)^(1/60)`, exact at 60 frames a second. VRM's motion depends on the
  frame rate (the specification says so); ours does not.
- **Gravity** adds displacement times `dt` there, so it acts like an
  acceleration of `gravityPower / dt`: `gravityPower = gravity / 60`, exact
  at 60 frames a second.
- **Stiffness** cannot be matched exactly: VRM pushes the tip back with the
  same force however far it is out, ours with a force in proportion. We
  match how far a LEVEL segment droops under gravity: ours settles where the
  pull balances gravity, VRM's where `tan θ = gravityPower / stiffness`.
  Swings away from that settle differently (VRM's springs come back at a
  constant speed and do not ring as ours do).
- **Measured on the weasel's tail** (five joints, our default settings, the
  file read by three-vrm with nothing set up by hand): standing, the tip
  settles 26 cm lower in three-vrm and 43 cm lower in ours; run sideways at
  3 m/s for half a second and stopped, it swings about as far and as long in
  both (still ±0.3 m two seconds later, which is what our defaults are).
  VRM bends each joint from its parent's current direction, ours from the
  anchor's, so a long chain droops less there.
- **Colliders** are spheres in both, on a joint, with an offset in the
  joint's own frame; VRM gives each spring the collider GROUPS it meets.
  Our chain radius is VRM's `hitRadius`.
*/
/*{ "parent": "rigged-body-glb", "order": 1 }*/
/** Our chain's step, as `spring-chain` takes it. */
const STEP = 1 / 120;
/** The frame rate VRM's per-frame settings are matched at. */
const FRAME_RATE = 60;
/** Gravity used to match stiffness when a spring has none of its own. */
const REFERENCE_GRAVITY = 9.8;
/**
 * VRM's settings for one of our chain's joints, `length` its segment's
 * length in metres. Drag and gravity are exact at 60 frames a second;
 * stiffness matches the droop of a level segment (see above).
 */
export function vrmSpringJoint(node, s, length) {
    const damping = Math.min(0.999, Math.max(0, s.damping));
    const dragForce = 1 - Math.pow(1 - damping, 1 / FRAME_RATE);
    const gravityPower = s.gravity / FRAME_RATE;
    // Ours: a level segment settles where the pull per step balances gravity.
    const pull = 1 - Math.pow(1 - Math.min(0.999, Math.max(0, s.stiffness)), STEP * 10);
    const g = s.gravity > 0 ? s.gravity : REFERENCE_GRAVITY;
    const sag = pull > 0 ? (g * STEP * STEP) / pull : Infinity;
    const angle = Math.asin(Math.min(0.99, sag / Math.max(1e-4, length)));
    // VRM's: tan θ = gravityPower / stiffness.
    const stiffness = g / FRAME_RATE / Math.tan(angle);
    return {
        node,
        hitRadius: s.radius,
        stiffness: round(stiffness),
        gravityPower: round(gravityPower),
        gravityDir: [0, -1, 0],
        dragForce: round(Math.min(1, dragForce)),
    };
}
const round = (x) => Number(x.toPrecision(6));
/** The name of our own record of the springs. */
export const TOSIJS_SPRINGS = 'TOSIJS_spring_chains';
/**
 * The root `extensions` for a file's springs: `VRMC_springBone` (1.0) for
 * every VRM loader, and `TOSIJS_spring_chains` with our own settings.
 * `positions` gives each node's place in the file at rest, for segment lengths.
 */
export function springExtensions(chains, positions) {
    const colliders = [];
    const colliderIndex = new Map();
    const groups = [];
    const groupIndex = new Map();
    const groupFor = (list, name) => {
        if (list.length === 0)
            return [];
        const ids = list.map((c) => {
            const offset = c.offset.map(round);
            const key = `${c.node}:${offset.join(',')}:${round(c.radius)}`;
            let i = colliderIndex.get(key);
            if (i == null) {
                colliders.push({
                    node: c.node,
                    shape: { sphere: { offset, radius: round(c.radius) } },
                });
                i = colliders.length - 1;
                colliderIndex.set(key, i);
            }
            return i;
        });
        const key = ids.join(',');
        let g = groupIndex.get(key);
        if (g == null) {
            groups.push({ name, colliders: ids });
            g = groups.length - 1;
            groupIndex.set(key, g);
        }
        return [g];
    };
    const segment = (a, b) => {
        const p = positions[a];
        const q = positions[b];
        return Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]);
    };
    const springs = chains.map((c) => ({
        name: c.name,
        joints: c.joints.map((node, k) => {
            const next = c.joints[k + 1] ?? node;
            const prev = c.joints[k - 1] ?? node;
            const length = k + 1 < c.joints.length ? segment(node, next) : segment(prev, node);
            return vrmSpringJoint(node, c.settings, length);
        }),
        colliderGroups: groupFor(c.colliders, `${c.name} colliders`),
    }));
    const ours = {
        version: 1,
        springs: chains.map((c, i) => ({
            name: c.name,
            kind: c.kind,
            joints: c.joints,
            stiffness: c.settings.stiffness,
            damping: c.settings.damping,
            gravity: c.settings.gravity,
            radius: c.settings.radius,
            colliderGroups: springs[i].colliderGroups,
            ...(c.strand ? { strand: c.strand } : {}),
        })),
    };
    return {
        VRMC_springBone: {
            specVersion: '1.0',
            ...(colliders.length ? { colliders, colliderGroups: groups } : {}),
            springs: springs.map((s) => ({
                name: s.name,
                joints: s.joints,
                ...(s.colliderGroups.length
                    ? { colliderGroups: s.colliderGroups }
                    : {}),
            })),
        },
        [TOSIJS_SPRINGS]: ours,
    };
}
/** JSON Schema of `TOSIJS_spring_chains`: the one definition the builder and the exports share. */
export function springChainsSchema() {
    const vec3 = {
        type: 'array',
        items: { type: 'number' },
        minItems: 3,
        maxItems: 3,
    };
    return {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        $id: 'https://3d.tosijs.net/schema/TOSIJS_spring_chains-1.json',
        title: 'TOSIJS_spring_chains',
        description: "tosijs-3d's spring chains (spring-chain's model) on a glTF's root extensions, beside VRMC_springBone, whose collider groups they share.",
        type: 'object',
        required: ['version', 'springs'],
        properties: {
            version: { const: 1 },
            springs: {
                type: 'array',
                items: {
                    type: 'object',
                    required: [
                        'name',
                        'kind',
                        'joints',
                        'stiffness',
                        'damping',
                        'gravity',
                        'radius',
                    ],
                    properties: {
                        name: { type: 'string' },
                        kind: { enum: ['bones', 'strand'] },
                        joints: {
                            type: 'array',
                            items: { type: 'integer', minimum: 0 },
                            minItems: 2,
                        },
                        stiffness: {
                            type: 'number',
                            minimum: 0,
                            maximum: 1,
                            description: '0 hangs free, 1 holds its rest shape',
                        },
                        damping: {
                            type: 'number',
                            minimum: 0,
                            maximum: 1,
                            description: 'velocity lost per second',
                        },
                        gravity: {
                            type: 'number',
                            description: 'metres per second², downward',
                        },
                        radius: {
                            type: 'number',
                            minimum: 0,
                            description: 'metres, for colliders',
                        },
                        colliderGroups: {
                            type: 'array',
                            items: { type: 'integer', minimum: 0 },
                            description: "indices into VRMC_springBone's colliderGroups",
                        },
                        strand: {
                            type: 'object',
                            required: ['anchor', 'path', 'radius', 'tipRadius', 'color'],
                            properties: {
                                anchor: { type: 'integer', minimum: 0 },
                                path: { type: 'array', items: vec3, minItems: 2 },
                                radius: { type: 'number', minimum: 0 },
                                tipRadius: { type: 'number', minimum: 0 },
                                color: { type: 'string' },
                            },
                        },
                    },
                },
            },
        },
    };
}
//# sourceMappingURL=spring-vrm.js.map