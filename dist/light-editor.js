/*#
# light-editor

**`lightEditor3d` — the whole lamp, not just its curves.** A `Widget3d` that
edits what a light *is* (type, colour, intensity, range, shadows) alongside what
it *does over time* ([[curve-program|curveProgram3d]]), with a power switch so
you can watch the attack and decay play out.

## Demo

See [[curve-program]], which uses this to drive a real lamp.
## Why the two halves belong together

A program editor on its own is half a job: you can draw a beautiful strike-and-
decay and have no way to say the lamp is a warm 40 W spot that casts shadows.
Tonio, on the program editor by itself: _"presumably we need to be able to
configure the light's basic properties (like its basic color, intensity, whether
it casts shadows, the type of light, and so on, or we've only done half the
job."_

So this is one field, for the same reason a program is one field: what you get
back is a complete lamp description that can be handed straight to
[[b3d-lamp|b3dPointLight]] / `b3dSpotLight` / `b3dAreaLight`.

## Colour is HSV, not RGB

Two sliders — hue and saturation — and **no value slider**, because value *is*
`intensity` and having both would give you two ways to dim a lamp that disagree.

RGB would need three sliders to express "the same colour, a bit warmer", which
is the edit you actually make on a light. It also matches how the program's
`hue` and `saturation` channels modulate it, so the static colour and the
animated one are described in the same terms.

## A power SWITCH, not a button

It is state — the lamp is on or it is off — and a button reads as "do something
once". The first version of this was a button and Tonio did not recognise it as
the switch it was.

*/
/*{ "parent": "UI", "order": 264 }*/
import { svgElements } from 'tosijs';
import { label3d, slider3d, toggle3d, select3d, } from './widgets3d';
import { curveProgram3d } from './curve-program';
import { DEFAULT_LIGHT, } from './light-settings';
import { stackLayout } from './widgets3d-layout';
const { g } = svgElements;
/**
 * An editor for a whole lamp.
 *
 * ```js
 * const editor = lightEditor3d({
 *   value: { kind: 'spot', hue: 35, intensity: 600 },
 *   handleChange: (s) => applyToLamp(s),
 * })
 * ```
 */
export function lightEditor3d(config = {}) {
    let s = { ...DEFAULT_LIGHT, ...config.value };
    const el = g({ 'data-w3d': 'light-editor' });
    const emit = (describe, commit) => {
        config.handleChange?.({ ...s });
        if (commit)
            config.handleCommit?.({ ...s }, describe);
    };
    /*
    A slider's gesture end is not exposed, so each one commits on every change.
    That is the honest option today rather than a silent lie: a consumer
    coalescing by `describe` still gets one undo entry per control, and the
    alternative — pretending a drag is one gesture when the widget cannot tell —
    would put the WRONG value in a history.
  
    Filed as the follow-up rather than worked around here, because the fix
    belongs in `slider3d` where the pointer actually is.
    */
    const num = (label, key, min, max, step, extra = {}) => slider3d({
        label,
        value: s[key],
        min,
        max,
        step,
        showValue: 'always',
        ...extra,
        onChange: (v) => {
            s = { ...s, [key]: v };
            emit(`set light ${key}`, true);
        },
    });
    const rows = [
        // The switch FIRST: it is the control you reach for while watching the
        // program, and burying it under six sliders would hide the thing the
        // program editor exists to demonstrate.
        //
        // Its label is just "power". The explanation goes ABOVE as its own line,
        // because a control's label should name the control — a label carrying an
        // instruction reads as part of the sentence and stops looking like a
        // switch, which is how the first version went unrecognised.
        label3d({ text: 'flip it to watch the attack and decay', muted: true }),
        toggle3d({
            label: 'power',
            value: s.on,
            onChange: (v) => {
                s = { ...s, on: v };
                emit(v ? 'switch light on' : 'switch light off', true);
            },
        }),
        select3d({
            label: 'type',
            value: s.kind,
            options: ['point', 'spot', 'area'],
            onChange: (v) => {
                s = { ...s, kind: v };
                emit('set light type', true);
            },
        }),
        num('hue', 'hue', 0, 360, 1),
        num('saturation', 'saturation', 0, 1, 0.01),
        /*
        LOG, because a lamp's useful range spans five orders of magnitude: a point
        light lives near 1 and a spot near 600, and on a linear 0..1000 track
        everything below 1 sits in the first thousandth of the travel — the values
        you actually reach for are the ones you cannot set.
    
        Plain decimals rather than significant figures: it is a number people
        compare against other numbers, and "0.05" reads better than "0.0523".
    
        But the decimals are DROPPED past 100, and that is not cosmetic.
        `showValue: 'always'` reserves the width of the widest value it could
        show, so formatting the top of the range as "1000.00" squeezed the track to
        51px against 81-91px for its neighbours — five decades in fifty pixels,
        which is the same unusable-at-one-end problem the log scale was added to
        fix, arriving from the other direction. "1000" costs three characters less
        and gives the travel back.
        */
        num('intensity', 'intensity', 0.01, 1000, 0, {
            scale: 'log',
            format: (v) => (v >= 100 ? v.toFixed(0) : v.toFixed(2)),
        }),
        num('range', 'range', 1, 60, 1),
        num('cone angle (spot)', 'angle', 5, 160, 1),
        toggle3d({
            label: 'casts shadows',
            value: s.shadows,
            onChange: (v) => {
                s = { ...s, shadows: v };
                emit(v ? 'enable light shadows' : 'disable light shadows', true);
            },
        }),
        label3d({ text: 'program — attack · sustain · decay', muted: true }),
    ];
    const program = curveProgram3d({
        value: s.program,
        handleChange: (p) => {
            s = { ...s, program: p };
            config.handleChange?.({ ...s });
        },
        handleCommit: (p, describe) => {
            s = { ...s, program: p };
            config.handleCommit?.({ ...s }, describe);
        },
    });
    rows.push(program);
    for (const r of rows)
        el.appendChild(r.el);
    let offsets = [];
    let heights = [];
    const GAP = 4;
    let captured = -1;
    const childAt = (y) => {
        for (let i = 0; i < offsets.length; i++) {
            if (y >= offsets[i] && y <= offsets[i] + heights[i])
                return i;
        }
        return -1;
    };
    return {
        el,
        setHost(host) {
            for (const r of rows)
                r.setHost?.(host);
        },
        layout(width) {
            heights = rows.map((r) => r.layout?.(width) ?? 0);
            const stacked = stackLayout(heights, GAP);
            offsets = stacked.offsets;
            rows.forEach((r, i) => {
                r.el.setAttribute('transform', `translate(0, ${offsets[i]})`);
            });
            return stacked.total;
        },
        handle(kind, x, y) {
            if (kind === 'down')
                captured = childAt(y);
            const i = captured >= 0 ? captured : childAt(y);
            if (i < 0)
                return;
            rows[i].handle?.(kind, x, y - offsets[i]);
            if (kind === 'up' || kind === 'leave')
                captured = -1;
        },
        hitTest(x, y) {
            const i = childAt(y);
            if (i < 0)
                return false;
            return rows[i].hitTest?.(x, y - offsets[i]) ?? true;
        },
        get value() {
            return { ...s };
        },
        setValue(next) {
            s = { ...s, ...next };
            if (next.program)
                program.setValue(next.program);
        },
    };
}
//# sourceMappingURL=light-editor.js.map