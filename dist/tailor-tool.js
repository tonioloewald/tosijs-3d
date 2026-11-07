/*#
# tailor tool

**Cut a garment out of a body, and hand it back.** Draw an outline over the
body's front view and the skin inside it, front and back, becomes cloth:
a rectangle from the waist to the ankles is a pair of trousers. The tool
works on any [rigged body](/rigged-body/) (MakeHuman's, or a mesh the
[rig tool](/rig-tool/) bound), previews the cut on the body as it moves, and
on **done** hands your callback the garment. The
[character builder](/character-builder/)'s **tailor…** opens it.

```javascript
import { mountTailorTool } from 'tosijs-3d'

const tailor = mountTailorTool(scene, {
  body, // a RiggedBody: what it cuts from
  built, // the body on screen (buildBody): what the cut is shown on
  slots: ['top', 'bottom', 'outfit'],
  handleDone: ({ garment, name, slot, look, cut }) => wardrobe.add(garment, { name, slot, look, cut }),
  handleCancel: () => {},
})
```

**Its panel is a system panel** (scissors, on the bar). A bar pinned to its
top carries **undo**, **redo**, **cancel** and **done**; below it:

- **the outline**: you draw the character's left, on your right, and the
  other side is its mirror. Click out points, click the first to close a
  shape, drag a point to move it, press an edge to add one;
- **cloth mesh**: the cloth is cut from an even surface laid over the body
  ([remesh](/remesh/)), **coarse**, **medium** (the default) or **fine**
  (edges about 3, 2 or 1.2 cm), whatever the body's own triangles are; **as
  the body** cuts the body's triangles themselves;
- **thickness** (thicker cloth bridges more of the chest, where the body
  says where its nipples are);
- **made by**: **cutting the skin** (the cloth follows the body),
  **draping cloth** (a front and a back piece laid over the body, sewn where
  the outline runs up and down past its edge and settled under gravity, so
  it bridges hollows and hangs: dresses, tunics, robes; see
  [cloth drape](/cloth-drape/)), or **rings** (round the outline at each
  height: skirts, kilts);
- **material**, **name** and **slot**.

**Undo and redo** (and ⌘Z / ⇧⌘Z through `undo()` / `redo()`, which a host's
keys call while the tool is open): each settled edit, a point dropped or a
slider let go, is a step.

WHAT DONE HANDS BACK is the garment as a mesh at rest, on the body it was
cut from (`garment`: positions, triangles, UVs unwrapped like a sewing
pattern), with what it was cut from (`cut`: the outlines, thickness, how it was made)
so it can be opened again, and the name, slot and material recipe. Binding it
to a body to wear (`bindGarment`) is the host's: a garment file carries the
same mesh.

A host that keeps the garment itself passes `persistent` (no cancel or
done), its own system panel as `panel`, and rows of its own above and below
(`rows: { top, bottom }`); the character builder does, so its tailor is
always on the bar.

`handleChange` hears every edit (a work in progress to keep); `setBody`
moves the cut onto a body reshaped while the tool is open; `unmount` (or
done, or cancel) removes everything it added.
*/
/*{ "parent": "character-builder", "order": 30 }*/
import { cutGarment, skirtGarment, rebindCut, mirrorOutline, } from './garment-cut.js';
import { outlineField3d } from './outline-field.js';
import { smoothUnder, fitProxy, drawnPositions } from './proxy-fit.js';
import { remesh, remeshSteps } from './remesh.js';
import { drapeGarmentAsync, runSliced } from './cloth-drape.js';
import { humanProxy, proxyMaterial } from './human-proxy.js';
import { clothShading, clothRecipe } from './cloth-shading.js';
import { unwrapGarment } from './garment-file.js';
import { materialPicker3d } from './material-picker.js';
import { inputField } from './keyboard.js';
import { b3dPanel } from './b3d-panel.js';
import { undoHistory } from './undo-history.js';
import { button3d, iconBar3d, label3d, panel3d, row3d, select3d, slider3d, toggle3d, } from './widgets3d.js';
/** The edge length each density aims for, metres. */
export const TAILOR_MESH_EDGE = {
    coarse: 0.03,
    medium: 0.02,
    fine: 0.012,
};
/** Cloth over the body: the cut is fitted a little out from the skin. */
const EASE = 6;
/**
 * Open the tailor in a `<tosi-b3d>`: a system panel, a preview on `built`,
 * and the garment handed to `handleDone`.
 */
export function mountTailorTool(owner, options) {
    const scene = owner.scene;
    let body = options.body;
    let built = options.built;
    const cut = {
        shapes: options.cut?.shapes ?? [],
        thickness: options.cut?.thickness ?? 0.005,
        skirt: options.cut?.skirt ?? false,
        drape: options.cut?.drape ?? false,
        mesh: options.cut?.mesh ?? 'medium',
    };
    let look = options.look ??
        clothRecipe({ fabric: 'cotton', colour: '#3b5b8a', recolour: 1 });
    let name = options.name ?? '';
    let slot = options.slot ?? options.slots?.[0] ?? 'top';
    let hideOthers = options.hideOthers ?? false;
    let status = '';
    let disposed = false;
    const state = () => ({
        cut: JSON.parse(JSON.stringify(cut)),
        look: JSON.parse(JSON.stringify(look)),
        name,
        slot,
    });
    /*
    UNDO: the state recorded as each edit settles (a slider drag is one step),
    and restored as opening with it would.
    */
    const history = undoHistory({ limit: 100 });
    history.record(state());
    let stepTimer = null;
    let restoring = false;
    const buttons = () => `${canUndo()}${canRedo()}`;
    const record = () => {
        const was = buttons();
        if (stepTimer != null)
            clearTimeout(stepTimer);
        stepTimer = null;
        history.record(state());
        if (buttons() !== was)
            refresh();
    };
    const canUndo = () => history.canUndo || stepTimer != null;
    const canRedo = () => stepTimer == null && history.canRedo;
    const changed = () => {
        options.handleChange?.(state());
        if (restoring)
            return;
        // The buttons are redrawn when the step is recorded, not mid-drag.
        if (stepTimer != null)
            clearTimeout(stepTimer);
        stepTimer = setTimeout(record, 400);
    };
    const restore = (st) => {
        if (st == null)
            return;
        restoring = true;
        const c = JSON.parse(JSON.stringify(st.cut));
        Object.assign(cut, c);
        look = JSON.parse(JSON.stringify(st.look));
        name = st.name;
        slot = st.slot;
        shading?.set({ recipe: look });
        // The outline starts afresh: its selection was in the shapes undone.
        field = null;
        recut();
        changed();
        restoring = false;
        refresh();
    };
    const undo = () => {
        if (!canUndo())
            return;
        if (stepTimer != null)
            record();
        restore(history.undo());
    };
    const redo = () => {
        if (canRedo())
            restore(history.redo());
    };
    /*
    THE BODY, as the cut needs it: fitted over with its nipples smoothed (cloth
    bridges them), cut from a body smoothed more for thicker cloth, and the skin
    a skirt may go round (not the arms).
    */
    let fitOn = body.positions;
    let notArm = new Uint8Array(0);
    // The triangles cloth is cut from: not a tail's (behind the body, inside
    // any outline drawn round the hips, and swung by its spring).
    let cutFrom = body.indices;
    const readBody = () => {
        const nipples = body.regions.nipples;
        fitOn = nipples
            ? smoothUnder(body.positions, body.indices, nipples)
            : body.positions;
        const arm = new Set(body.rig.joints
            .map((j, i) => /^(clavicle|upperarm|lowerarm|hand|thumb|index|middle|ring|pinky)/.test(j.name)
            ? i
            : -1)
            .filter((i) => i >= 0));
        const n = body.positions.length / 3;
        notArm = new Uint8Array(n);
        const w = body.weights;
        for (let v = 0; v < n; v++) {
            let a = 0;
            for (let k = 0; k < 4; k++)
                if (arm.has(w.indices[v * 4 + k]))
                    a += w.weights[v * 4 + k];
            notArm[v] = a < 0.5 ? 1 : 0;
        }
        const tail = new Set(body.rig.joints
            .map((j, i) => (/^tail_/.test(j.name) ? i : -1))
            .filter((i) => i >= 0));
        if (tail.size === 0)
            cutFrom = body.indices;
        else {
            const onTail = new Uint8Array(n);
            for (let v = 0; v < n; v++) {
                let t = 0;
                for (let k = 0; k < 4; k++)
                    if (tail.has(w.indices[v * 4 + k]))
                        t += w.weights[v * 4 + k];
                onTail[v] = t >= 0.5 ? 1 : 0;
            }
            const kept = [];
            const I = body.indices;
            for (let i = 0; i < I.length; i += 3)
                if (!onTail[I[i]] && !onTail[I[i + 1]] && !onTail[I[i + 2]])
                    kept.push(I[i], I[i + 1], I[i + 2]);
            cutFrom = Uint32Array.from(kept);
        }
    };
    readBody();
    /*
    THE DUMMY: an even surface over the body to cut cloth from, made once per
    density (half a second or so) and again when the body changes.
    */
    let dummies = new Map();
    const dummy = (mesh) => {
        let d = dummies.get(mesh);
        if (!d) {
            d = remesh(fitOn, cutFrom, { edge: TAILOR_MESH_EDGE[mesh] });
            dummies.set(mesh, d);
        }
        return d;
    };
    /*
    THE PREVIEW: the cut bound to the body like any garment and drawn on the
    body shown, in its material.
    */
    let made = null;
    let mesh = null;
    const shell = (c) => ({
        ...c,
        name: 'tailored',
        category: 'clothes',
        slot,
        material: { alpha: false, twoSided: cut.skirt || cut.drape === true },
    });
    let material = null;
    let shading = null;
    /** The cut on show: drawn on the body, in its material (null clears it). */
    const show = (next) => {
        mesh?.dispose();
        mesh = null;
        made = next;
        if (next == null)
            return;
        const proxy = shell(next);
        if (material == null) {
            material = proxyMaterial(scene, proxy);
            shading = clothShading(material);
            shading.set({ recipe: look });
        }
        // Skirts and draped cloth are open: their inside shows.
        const open = cut.skirt || cut.drape === true;
        material.backFaceCulling = !open;
        material.twoSidedLighting = open;
        mesh = humanProxy(scene, built, proxy, fitOn, body.weights, material);
        owner.register?.({ meshes: [mesh] });
    };
    /*
    A DRAPE IS SETTLED IN THE BACKGROUND. It is a simulation (a second or more
    on a fine mesh), so it runs in time slices after the edits pause, the cloth
    as it was stays on show meanwhile, and the next edit stops it: moving a point
    never waits for a drape it has already made stale.
    */
    let draping = null;
    let drapeSoon = null;
    /** Done (or cancel) pressed while a drape was settling: finished after it. */
    let finishAfter = null;
    const stopDrape = () => {
        draping?.abort();
        draping = null;
        if (drapeSoon != null)
            clearTimeout(drapeSoon);
        drapeSoon = null;
    };
    const drapeLater = (outline) => {
        const density = cut.mesh === 'body' ? 'medium' : cut.mesh ?? 'medium';
        const say = (next) => {
            if (next === status)
                return;
            status = next;
            refresh();
        };
        say('draping…');
        drapeSoon = setTimeout(() => {
            drapeSoon = null;
            const run = (draping = new AbortController());
            // Draped over the even surface (as the body: medium), made in slices
            // too the first time (half a second or more at once).
            const made = dummies.get(density);
            const surface = made
                ? Promise.resolve(made)
                : runSliced(remeshSteps(fitOn, cutFrom, { edge: TAILOR_MESH_EDGE[density] }), { signal: run.signal }).then((d) => {
                    // Not if the body changed meanwhile (that stops this run).
                    if (run === draping)
                        dummies.set(density, d);
                    return d;
                });
            surface
                .then((d) => drapeGarmentAsync(d, fitOn, {
                front: outline,
                thickness: cut.thickness,
                edge: TAILOR_MESH_EDGE[density],
            }, { signal: run.signal }))
                .then((g) => {
                if (run !== draping || disposed)
                    return;
                draping = null;
                show(g);
                say('');
                if (finishAfter != null)
                    finish(finishAfter);
            }, (e) => {
                if (run !== draping || disposed || e.name === 'AbortError')
                    return;
                draping = null;
                show(null);
                say(`could not cut: ${e.message}`);
                finishAfter = null;
            });
        }, 200);
    };
    const recut = () => {
        if (disposed)
            return;
        stopDrape();
        const outline = mirrorOutline(cut.shapes.filter((s) => s.length >= 3));
        if (!outline.length)
            return show(null);
        if (cut.drape && !cut.skirt)
            return drapeLater(outline);
        try {
            const nipples = body.regions.nipples;
            // Thicker cloth bridges more of the chest.
            const cutOn = nipples
                ? smoothUnder(body.positions, body.indices, nipples, {
                    bridge: cut.thickness / 0.02,
                })
                : fitOn;
            const density = cut.mesh ?? 'medium';
            let next;
            if (cut.skirt) {
                next = skirtGarment(fitOn, cutFrom, {
                    front: outline,
                    thickness: cut.thickness,
                    anchor: notArm,
                });
            }
            else if (density === 'body') {
                next = cutGarment(cutOn, cutFrom, {
                    front: outline,
                    thickness: cut.thickness,
                    ease: EASE,
                    fitOn,
                });
            }
            else {
                // Cut from the even surface, then bound to the body itself.
                const d = dummy(density);
                next = rebindCut(cutGarment(d.positions, d.triangles, {
                    front: outline,
                    thickness: cut.thickness,
                    ease: EASE,
                }), d, fitOn);
            }
            show(next);
            status = '';
        }
        catch (e) {
            status = `could not cut: ${e.message}`;
            show(null);
        }
    };
    const garment = () => made == null
        ? null
        : unwrapGarment({
            positions: drawnPositions(made, fitProxy(made, fitOn)),
            triangles: made.triangles,
        });
    /*
    THE PANEL: a system panel of its own, done and cancel first.
    */
    let field = null;
    // Pinned above the scrolling rows: they must not scroll out of reach.
    const header = () => [
        iconBar3d({
            items: [
                {
                    icon: 'rotateCcw',
                    title: 'undo (⌘Z)',
                    dim: !canUndo(),
                    handleClick: undo,
                },
                {
                    icon: 'rotateCw',
                    title: 'redo (⇧⌘Z)',
                    dim: !canRedo(),
                    handleClick: redo,
                },
                ...(options.persistent
                    ? []
                    : [
                        { spacer: true },
                        {
                            icon: 'close',
                            title: 'cancel',
                            handleClick: () => finish(false),
                        },
                        {
                            icon: 'check',
                            title: 'done: keep the garment',
                            handleClick: () => finish(true),
                        },
                    ]),
            ],
        }),
    ];
    const widgets = () => [
        ...(options.rows?.top?.() ?? []),
        ...(status ? [label3d({ text: status, muted: true, compact: true })] : []),
        (field = outlineField3d({
            positions: body.positions,
            indices: body.indices,
            value: cut.shapes,
            // The panel is rebuilt as the status changes (a drape starting and
            // settling): the outline carries on with its selection and open shape.
            editing: field?.editing,
            maxHeight: 400,
            // A drape pins its cloth where the outline is over the body.
            anchors: cut.drape === true && !cut.skirt,
            handleCommit: (v) => {
                cut.shapes = v;
                recut();
                changed();
                if (status)
                    refresh();
            },
        })),
        row3d({}, button3d({
            label: 'delete point',
            handleClick: () => field?.removeSelected(),
        }), button3d({ label: 'clear', handleClick: () => field?.clear() })),
        slider3d({
            label: 'thickness',
            value: cut.thickness,
            min: 0.001,
            max: 0.02,
            step: 0.001,
            handleChange: (v) => {
                cut.thickness = v;
                recut();
                changed();
            },
        }),
        select3d({
            label: 'cloth mesh',
            value: cut.mesh ?? 'medium',
            options: [
                'coarse',
                'medium',
                'fine',
                { label: 'as the body', value: 'body' },
            ],
            handleChange: (v) => {
                cut.mesh = v;
                recut();
                changed();
            },
        }),
        select3d({
            label: 'made by',
            value: cut.skirt ? 'skirt' : cut.drape ? 'drape' : 'cut',
            options: [
                { label: 'cutting the skin', value: 'cut' },
                { label: 'draping cloth', value: 'drape' },
                { label: 'rings (skirt)', value: 'skirt' },
            ],
            handleChange: (v) => {
                cut.skirt = v === 'skirt';
                cut.drape = v === 'drape';
                recut();
                changed();
                // The outline shows what a drape anchors, and only in drape mode.
                refresh();
            },
        }),
        materialPicker3d({
            label: 'material',
            value: look,
            types: ['cloth'],
            collections: ['fabrics', 'textiles'],
            keep: ['albedo', 'recolour'],
            handleChange: (r) => {
                look = r;
                shading?.set({ recipe: look });
                changed();
            },
        }),
        inputField({
            value: name,
            placeholder: 'name the garment',
            handleChange: (v) => {
                name = v;
                changed();
            },
        }),
        ...(options.slots?.length
            ? [
                select3d({
                    label: 'slot',
                    value: slot,
                    options: options.slots,
                    handleChange: (v) => {
                        slot = String(v);
                        changed();
                    },
                }),
            ]
            : []),
        ...(options.handleHideOthers
            ? [
                toggle3d({
                    label: 'hide other clothes',
                    value: hideOthers,
                    handleChange: (v) => {
                        hideOthers = v;
                        options.handleHideOthers?.(v);
                    },
                }),
            ]
            : []),
        ...(options.rows?.bottom?.() ?? []),
    ];
    const ownPanel = options.panel == null;
    const panelEl = options.panel ??
        b3dPanel({
            icon: 'scissors',
            title: 'Tailor',
            exclusive: 'off',
            open: true,
        });
    const panelSvg = () => panel3d({
        width: 340,
        height: 'fit',
        maxHeight: Math.min(720, owner.panelRoom?.(panelEl) ?? 720),
        header: header(),
    }, ...widgets());
    function refresh() {
        if (!disposed)
            panelEl.svg = panelSvg();
    }
    panelEl.svg = panelSvg();
    if (ownPanel)
        owner.append(panelEl);
    // Redrawn to the view's height once a resize settles.
    owner.addEventListener?.('resizeend', refresh);
    recut();
    if (status)
        refresh();
    function unmount() {
        if (disposed)
            return;
        if (stepTimer != null)
            clearTimeout(stepTimer);
        stopDrape();
        disposed = true;
        owner.removeEventListener?.('resizeend', refresh);
        mesh?.dispose();
        material?.dispose();
        if (!ownPanel)
            return;
        if (hideOthers)
            options.handleHideOthers?.(false);
        owner._closeSystemPanel?.(panelEl);
        panelEl.remove();
    }
    function finish(done) {
        // Done waits for the drape settling now (it is the garment); cancel does not.
        if (done && (draping != null || drapeSoon != null)) {
            finishAfter = true;
            return;
        }
        finishAfter = null;
        const g = done ? garment() : null;
        if (done && g == null) {
            status = 'close an outline first';
            refresh();
            return;
        }
        const s = state();
        unmount();
        if (done)
            options.handleDone?.({ ...s, garment: g });
        else
            options.handleCancel?.();
    }
    return {
        get state() {
            return state();
        },
        garment,
        setBody(b, k) {
            body = b;
            built = k;
            readBody();
            dummies = new Map();
            recut();
            // The outline is drawn over this body now.
            refresh();
        },
        done: () => finish(true),
        cancel: () => finish(false),
        unmount,
        refresh,
        undo,
        redo,
        get canUndo() {
            return canUndo();
        },
        get canRedo() {
            return canRedo();
        },
    };
}
//# sourceMappingURL=tailor-tool.js.map