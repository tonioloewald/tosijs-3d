import { realNow } from './clock.js';
/** Median and 95th percentile of a list of frame intervals. */
export function summarise(intervals) {
    if (intervals.length === 0)
        return { ms: 0, p95: 0 };
    const sorted = [...intervals].sort((a, b) => a - b);
    const at = (q) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))];
    return { ms: at(0.5), p95: at(0.95) };
}
/**
 * The group a mesh belongs to: its material's name, or its own, with instance
 * numbers dropped so `tile_12` and `tile_7` are one group, and cut at the
 * first hyphen so a family of materials is one group too.
 */
export function groupKey(meshName, materialName) {
    const raw = materialName != null && materialName !== '' ? materialName : meshName;
    const key = raw
        // A family of materials (`deco-leaf-Green`, `deco-bark-Wood`) is one group.
        .replace(/^((?:b3d|tosi)-[^-]+|[^-]+).*$/, '$1')
        .replace(/[_\-. ]*\d+$/g, '')
        .replace(/[_\-. ]+$/g, '')
        .trim();
    return key === '' ? 'unnamed' : key;
}
/** Keep the `keep` heaviest groups; the rest become one group called `other`. */
export function topGroups(groups, keep = 12) {
    const ranked = [...groups.entries()].sort((a, b) => b[1].weight - a[1].weight);
    const out = ranked
        .slice(0, keep)
        .map(([name, g]) => ({ name, items: g.items }));
    const rest = ranked.slice(keep).flatMap(([, g]) => g.items);
    if (rest.length > 0)
        out.push({ name: 'other', items: rest });
    return out;
}
/** The baseline first, then the rest by what they saved, as panel lines. */
export function formatSweep(rows) {
    if (rows.length === 0)
        return [];
    const [base, ...rest] = rows;
    const sorted = [...rest].sort((a, b) => b.saved - a.saved);
    const fps = (ms) => (ms > 0 ? Math.round(1000 / ms) : 0);
    return [
        `${base.name}  ${base.ms.toFixed(1)}ms  ${fps(base.ms)}fps  p95 ${base.p95.toFixed(0)}`,
        ...sorted.map((r) => `${r.saved >= 0 ? '-' : '+'}${Math.abs(r.saved).toFixed(1)}  ${r.name}  (${r.ms.toFixed(1)}ms ${fps(r.ms)}fps)`),
    ];
}
/** `runs` with `run` added or replaced (by number), newest first, `keep` kept. */
export function recordRun(runs, run, keep = 4) {
    return [run, ...runs.filter((r) => r.n !== run.n)]
        .sort((a, b) => b.n - a.n)
        .slice(0, keep);
}
/**
 * The kept runs as panel lines, newest first. Every run gets a heading saying
 * whether it finished and, if not, where it stopped. Rows are listed for the
 * newest run and for the newest of each kind that has any, so a run that hangs
 * at once does not hide the last one that measured something.
 */
export function formatRuns(runs, live = null) {
    const sorted = [...runs].sort((a, b) => b.n - a.n);
    const kindOf = (r) => r.kind ?? 'scene';
    const withRows = ['scene', 'shaders'].map((k) => sorted.find((r) => kindOf(r) === k && r.lines.length > 1));
    const out = [];
    for (const r of sorted) {
        const d = new Date(r.began);
        const at = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        const state = r.starting == null
            ? 'finished'
            : r.n === live
                ? 'running'
                : `STOPPED ${r.phase ?? 'at'} "${r.starting}"`;
        out.push(`run ${r.n}${kindOf(r) === 'shaders' ? ' (shaders)' : ''}  ${at}  ${state}`);
        if (r === sorted[0] || withRows.includes(r))
            out.push(...r.lines);
    }
    return out;
}
/**
 * Run the sweep on a live scene. One at a time: a second call while one is
 * running rejects, because two interleaved sweeps measure each other.
 */
let running = false;
export async function costSweep(scene, options = {}) {
    if (running)
        throw new Error('costSweep is already running');
    running = true;
    const seconds = options.seconds ?? 2;
    const settle = options.settle ?? 0.7;
    const engine = scene.getEngine();
    const session = options.xr?.baseExperience?.sessionManager;
    const inXr = session?.inXRSession === true;
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const groups = new Map();
    const drawn = [];
    for (const m of scene.meshes) {
        if (!m.isEnabled() || !m.isVisible || m.getTotalVertices() === 0)
            continue;
        if (options.skip?.(m) === true)
            continue;
        drawn.push(m);
        const key = groupKey(m.name, m.material?.name);
        const g = groups.get(key) ?? { weight: 0, items: [] };
        const copies = Math.max(1, m.thinInstanceCount ?? 1);
        // Ranked by how much of the view a group could cover, not by triangles:
        // on a headset the cost is pixels, and the sky is twelve triangles.
        const radius = m.getBoundingInfo().boundingSphere.radiusWorld;
        g.weight += radius * radius * copies;
        g.items.push(m);
        groups.set(key, g);
    }
    const hide = (items) => () => {
        for (const m of items)
            m.isVisible = false;
        return () => {
            for (const m of items)
                m.isVisible = true;
        };
    };
    const experiments = [
        { name: 'baseline', apply: () => () => { } },
    ];
    const scenic = options.only !== 'extra';
    if (scenic) {
        if (!inXr) {
            experiments.push({
                name: 'half the pixels',
                apply: () => {
                    const was = engine.getHardwareScalingLevel();
                    engine.setHardwareScalingLevel(was * Math.SQRT2);
                    return () => engine.setHardwareScalingLevel(was);
                },
            });
        }
        experiments.push({
            name: '- render targets',
            apply: () => {
                const was = scene.renderTargetsEnabled;
                scene.renderTargetsEnabled = false;
                return () => {
                    scene.renderTargetsEnabled = was;
                };
            },
        });
        experiments.push({
            name: '- shadows',
            apply: () => {
                const was = scene.shadowsEnabled;
                scene.shadowsEnabled = false;
                return () => {
                    scene.shadowsEnabled = was;
                };
            },
        });
        for (const g of topGroups(groups))
            experiments.push({ name: `- ${g.name}`, apply: hide(g.items) });
        experiments.push({ name: '- everything', apply: hide(drawn) });
    }
    // Again at the end: if this differs from the first, the device drifted
    // (heat, a background task) and the rows between are that much in doubt.
    experiments.push({ name: 'baseline again', apply: () => () => { } });
    /*
    The caller's own, LAST and after the closing baseline on purpose. The
    headset's resolution levers come in this way: they go through the device's
    compositor, the one part an emulator cannot exercise, and the first sweep run
    on a Quest hung there. Whatever they do, the scene rows are already measured
    and journalled by the time they start.
    */
    for (const e of options.extra ?? [])
        experiments.push(e);
    const rows = [];
    options.unthrottle?.(true);
    try {
        for (let i = 0; i < experiments.length; i++) {
            const e = experiments[i];
            options.progress?.(e.name, i, experiments.length);
            options.journal?.(rows, e.name, 'applying');
            const restore = e.apply();
            try {
                options.journal?.(rows, e.name, 'measuring');
                await wait(settle * 1000);
                const intervals = [];
                let last = 0;
                const obs = scene.onAfterRenderObservable.add(() => {
                    const now = realNow();
                    if (last > 0)
                        intervals.push(now - last);
                    last = now;
                });
                await wait(seconds * 1000);
                scene.onAfterRenderObservable.remove(obs);
                const s = summarise(intervals);
                rows.push({
                    name: e.name,
                    ms: s.ms,
                    p95: s.p95,
                    saved: rows.length > 0 ? rows[0].ms - s.ms : 0,
                    frames: intervals.length,
                });
            }
            finally {
                restore();
            }
        }
    }
    finally {
        options.unthrottle?.(false);
        options.progress?.(null, experiments.length, experiments.length);
        running = false;
    }
    options.journal?.(rows, null);
    return rows;
}
//# sourceMappingURL=cost-sweep.js.map