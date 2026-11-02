/*
WHICH BODIES THE SWEEP BUILDS.

The character builder's body sliders are MakeHuman's macros (gender, age, muscle,
weight, height, proportions, three ancestries) and five local shapes (bust
size and firmness, waist, chest depth, pecs), each 0..1. Every corner of
all fourteen is 2^14 = 16,384 bodies, each wearing ~180 proxies: too many,
and most of them say nothing new. The subset, and why:

1. MACRO CORNERS, the full product of the six macros that are blended as
   corners in `macroWeights` (gender x age x muscle x weight x height x
   proportions = 64), at an even ancestry mix. These are the targets that
   move the whole body, and they interact (MakeHuman stores
   `universal-<gender>-<age>-<muscle>-<weight>` per corner precisely because
   they do not add), so only the full product finds the bad combinations.
   Age runs 0.5 (25 years) to 1 (90): the sweep is of adults (children
   are out of its scope), so age below 0.5 is not swept.

2. ANCESTRY: each pure ancestry (3) on the corners where ancestry shapes
   matter most against clothing, gender x weight x muscle (8) at age 25,
   average height and proportions = 24. Ancestry targets change the face
   and proportions modestly; crossing them with all 64 would triple the
   run for little.

3. LOCAL SHAPES: each local shape at each end (5 x 2 = 10), on the four
   bodies that carry it differently (female/male x thin/heavy), at age 25
   = 40. They are additive targets (no corner blending), so one at a time
   finds their own trouble; plus the four "everything out" bodies (bust,
   chest depth, pecs and waist all at 1 on the same four bases), where the
   local shapes stack the most cloth-stretching way.

4. THE DEFAULT body, the reference every result is compared to: a garment
   that pokes through at the default is broken, not broken at the extremes.

133 bodies in all. `quick` keeps the default and the 64 macro corners at
age 25 only (32 + 1), for a fast look.
*/
import { DEFAULT_HUMAN_BODY } from './human-morph.js';
const MACROS = [
    'gender',
    'age',
    'muscle',
    'weight',
    'height',
    'proportions',
];
const SHORT = {
    gender: 'g',
    age: 'a',
    muscle: 'm',
    weight: 'w',
    height: 'h',
    proportions: 'p',
    african: 'af',
    asian: 'as',
    caucasian: 'ca',
    bustSize: 'bust',
    bustFirmness: 'firm',
    waist: 'waist',
    chestDepth: 'chest',
    pecs: 'pecs',
};
/** The local shapes, swept one at a time. */
export const LOCAL_SHAPES = [
    'bustSize',
    'bustFirmness',
    'waist',
    'chestDepth',
    'pecs',
];
/** What a body differs from the default in, as an id. */
export function cornerId(body) {
    const parts = [];
    for (const [k, v] of Object.entries(body)) {
        const d = DEFAULT_HUMAN_BODY[k] ?? 0.5;
        if (typeof v === 'number' && Math.abs(v - d) > 1e-9)
            parts.push(`${SHORT[k] ?? k}${+v.toFixed(3)}`);
    }
    return parts.length > 0 ? parts.join('-') : 'default';
}
const make = (group, values) => {
    const body = { ...DEFAULT_HUMAN_BODY, ...values };
    return { id: cornerId(body), group, body };
};
/** The sweep's bodies (see the comment at the top for the subset and why). */
export function sweepCorners(options = {}) {
    const out = [make('default', {})];
    const ages = options.quick ? [0.5] : [0.5, 1];
    const levels = {
        gender: [0, 1],
        age: ages,
        muscle: [0, 1],
        weight: [0, 1],
        height: [0, 1],
        proportions: [0, 1],
    };
    const product = (i, acc) => {
        if (i === MACROS.length) {
            out.push(make('macro', { ...acc }));
            return;
        }
        const k = MACROS[i];
        for (const v of levels[k])
            product(i + 1, { ...acc, [k]: v });
    };
    product(0, {});
    if (options.quick)
        return out;
    for (const race of ['african', 'asian', 'caucasian'])
        for (const gender of [0, 1])
            for (const weight of [0, 1])
                for (const muscle of [0, 1])
                    out.push(make('ancestry', {
                        gender,
                        weight,
                        muscle,
                        african: race === 'african' ? 1 : 0,
                        asian: race === 'asian' ? 1 : 0,
                        caucasian: race === 'caucasian' ? 1 : 0,
                    }));
    const bases = [
        { gender: 0, weight: 0 },
        { gender: 0, weight: 1 },
        { gender: 1, weight: 0 },
        { gender: 1, weight: 1 },
    ];
    for (const base of bases) {
        for (const shape of LOCAL_SHAPES)
            for (const v of [0, 1])
                out.push(make('local', { ...base, [shape]: v }));
        out.push(make('local', { ...base, bustSize: 1, chestDepth: 1, pecs: 1, waist: 1 }));
    }
    // Ids are unique (a local shape at its default would repeat a base).
    const seen = new Set();
    return out.filter((c) => (seen.has(c.id) ? false : (seen.add(c.id), true)));
}
//# sourceMappingURL=extremes-corners.js.map