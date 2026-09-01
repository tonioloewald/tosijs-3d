/*#
# theme-editor

**A live editor for the `--w3d-*` palette.** Every token that a widget actually
consumes, as a grid of controls: colours, metrics with a slider *and* a number
field, and a font menu. Change one and your rebuild callback fires.

## Why it is a component rather than a demo

It started as the demo on [[w3d-theme]], and a demo is the wrong home for it —
an adopter theming an app wants exactly this UI, and copying it out of a doc
comment is how it drifts from the palette it edits. `w3dTheme` is the one place
the tokens are declared; this is the one place they are edited.

It is a plain DOM component in its own module, so it tree-shakes out of a build
that never imports it. Nothing else in the library depends on it.

## Rebuilding is the caller's job, deliberately

The theme is read when a widget is **built** — see `setW3dTheme` for why that is
not an oversight (an SVG bound for a texture is serialised away from the
document, so `var(--w3d-text)` resolves against nothing and paints black). So
this cannot repaint your UI, and does not pretend to: it applies the change and
calls `onChange`, and you rebuild whatever you are showing.

## The colour input is injected

Alpha matters here — `panelBg`, `rowHover` and `selectedBg` are all `rgba()` —
and the native `<input type="color">` **cannot express it**, silently dropping
the channel so a translucent token looks broken rather than untouched.

But tosijs-ui is deliberately not a dependency of this library, and the SVG UI
has no colour picker of its own yet. So the control is a parameter: pass
`colorInput` (tosijs-ui's does alpha), or accept the native fallback and know
what it costs. When the SVG UI grows its own picker this defaults to that
instead.
*/
/*{ "parent": "UI" }*/
import { elements } from 'tosijs';
import { setW3dTheme, w3dTheme } from './w3d-theme';
const { div, label, select, option, span, input, h3 } = elements;
/**
 * One metric for every control, so the rows line up.
 *
 * A palette editor is read DOWN a column — you are comparing values, not using
 * one control — and controls at their natural heights make that a ragged list
 * where every row costs a little attention. `boxSizing` is what makes the
 * height actually equal across an input, a select and a colour swatch, whose
 * default padding and borders differ.
 *
 * Explicit colours rather than inherited: the editor lands on whatever surface
 * a host has, and a field inheriting a pale text colour from a dark page
 * renders light-grey-on-white.
 */
const CONTROL_HEIGHT = '26px';
const FIELD_STYLE = {
    background: '#fff',
    color: '#111',
    border: '1px solid #8b8b8b',
    borderRadius: '4px',
    padding: '0 5px',
    height: CONTROL_HEIGHT,
    boxSizing: 'border-box',
    font: '13px system-ui',
    minWidth: '0',
};
/** Tokens the widgets read today. Reserved ones are deliberately absent — see `w3d-theme`. */
const COLOURS = [
    'panelBg',
    'text',
    'muted',
    'accent',
    'rowBg',
    'rowHover',
    'buttonBg',
    'buttonHover',
    'buttonActive',
    'buttonActiveText',
    'track',
    'caret',
    'placeholder',
];
/** `[token, min, max, step]` — the metrics, all live. */
const METRICS = [
    ['fontSize', 10, 28, 1],
    ['roundedRadius', 0, 24, 1],
    ['padding', 0, 24, 1],
    ['spacing', 0, 24, 1],
    ['strokeWidth', 0.5, 6, 0.5],
    ['lineHeight', 1, 2, 0.05],
];
/**
 * Generic families first — they always resolve, whatever the platform — then
 * faces that ship on both macOS and Windows.
 *
 * Every chain ends in a generic on purpose: "installed on both" is a weaker
 * promise than it sounds even across OS versions, and elsewhere it is no
 * promise at all. A chain ending in `serif` degrades to something readable
 * rather than to whatever the browser happens to pick.
 */
export const FONT_STACKS = [
    'system-ui, sans-serif',
    'sans-serif',
    'serif',
    'monospace',
    'Georgia, serif',
    'Helvetica, Arial, sans-serif',
    '"Times New Roman", Times, serif',
    '"Courier New", Courier, monospace',
    'Verdana, Geneva, sans-serif',
    '"Trebuchet MS", Tahoma, sans-serif',
    'Palatino, "Palatino Linotype", "Book Antiqua", serif',
    'Impact, Haettenschweiler, sans-serif',
    /*
    A WEB font, to show that a theme is not limited to what is installed.
  
    It only renders if the host has actually loaded it — a font family is a
    request, not a guarantee, and `w3dTheme.fontFamily` is just a string handed to
    SVG. The demo loads it from Google Fonts; a consumer picking this stack
    without loading the face gets the `serif` fallback, which is the honest
    outcome rather than a broken one.
    */
    'Rosario, serif',
];
/**
 * Labels where the family name alone would mislead.
 *
 * Rosario is the only entry that needs the host to have loaded something, and
 * it is the only one that will not render on an in-scene panel — so the menu
 * says so rather than leaving you to discover it.
 */
const FONT_LABELS = {
    'Rosario, serif': 'Rosario (Google Web Font)',
};
/**
 * Build the editor. Returns a plain element — put it wherever you like.
 *
 * The grid is two columns (label, control) so the controls line up down the
 * page; a list of `label: control` pairs at natural width does not, and a
 * palette you are comparing values across is exactly where that shows.
 */
export function themeEditor(config = {}) {
    const { title = 'Theme Editor', onChange, colours = COLOURS, metrics = METRICS, } = config;
    const changed = () => onChange?.(w3dTheme);
    /**
     * Accept either a value or a DOM event from an injected control.
     *
     * The contract is easy to get wrong in one specific way, and I got it wrong
     * first: a tosijs `Component` binds any `on*` prop as a **DOM event
     * listener** (CLAUDE.md names this footgun explicitly), so an injected
     * `colorInput({onChange})` calls back with an `Event`, not a string. Setting
     * a token to an event object is not an error anywhere — it stringifies, fails
     * to parse as a colour, and the widget paints **black**. Tonio: "some of the
     * colors are just turning black once I set them."
     *
     * Normalising here rather than documenting the contract is deliberate: the
     * failure is silent and looks like a theme bug rather than a wiring bug, and
     * every consumer injecting a control would meet it once.
     */
    const asColor = (v) => {
        if (typeof v === 'string')
            return v || null;
        const target = v?.target;
        return typeof target?.value === 'string' ? target.value : null;
    };
    const nativeColor = (c) => input({
        type: 'color',
        value: c.value,
        onInput(evt) {
            c.onChange(evt.target.value);
        },
    });
    const makeColor = config.colorInput ?? nativeColor;
    const grid = div({
        class: 'w3d-theme-editor',
        style: {
            display: 'grid',
            // `max-content` for labels so they never wrap, `1fr` for controls so the
            // editor FILLS its column instead of sitting at some natural width.
            gridTemplateColumns: 'max-content 1fr',
            gap: '7px 12px',
            alignItems: 'center',
            width: '100%',
            maxWidth: '380px',
            font: '13px system-ui',
        },
    });
    if (title) {
        grid.append(h3({
            style: {
                gridColumn: '1 / -1',
                margin: '0 0 6px',
                font: '600 14px system-ui',
                opacity: '0.85',
                textAlign: 'center',
            },
        }, title));
    }
    const row = (name, control) => {
        // Stretch, so a colour swatch, a select and a slider all end the same
        // distance from the right edge. Ragged right-hand ends are what make a list
        // of controls read as untidy even when each one is fine on its own.
        // Height too, not just width. An injected control (tosijs-ui's colour input)
        // and a native range both come with their own intrinsic height, so asking
        // politely via a config option is not enough — measured 32 / 30 / 26 before
        // this line. The row owns the metric.
        Object.assign(control.style, {
            justifySelf: 'stretch',
            width: '100%',
            height: CONTROL_HEIGHT,
            boxSizing: 'border-box',
        });
        grid.append(label({ style: { justifySelf: 'end', opacity: '0.8' } }, name), control);
    };
    for (const key of colours) {
        const current = String(w3dTheme[key]);
        row(key, makeColor({
            height: CONTROL_HEIGHT,
            value: current,
            onChange: (v) => {
                const colour = asColor(v);
                if (colour == null)
                    return;
                setW3dTheme({ [key]: colour });
                changed();
            },
        }));
    }
    for (const [key, min, max, step] of metrics) {
        /*
        SLIDER AND NUMBER FIELD, KEPT IN SYNC.
    
        A slider alone hides the value you are setting — you can see a handle
        position but not the figure under it, which is the same complaint that put
        a readout on `slider3d`. The number field also lets you type an exact value,
        which dragging cannot do at a step of 0.05.
    
        Each writes the other, so they can never disagree; a pair that drifts is
        worse than a slider alone, because now two things claim to be the value.
        */
        const apply = (v) => {
            const n = Number(v);
            if (!Number.isFinite(n))
                return;
            setW3dTheme({ [key]: n });
            range.value = String(n);
            num.value = String(n);
            changed();
        };
        const range = input({
            type: 'range',
            min,
            max,
            step,
            value: String(w3dTheme[key]),
            style: { width: '100%', minWidth: '0', height: CONTROL_HEIGHT },
            onInput(evt) {
                apply(evt.target.value);
            },
        });
        const num = input({
            type: 'number',
            min,
            max,
            step,
            value: String(w3dTheme[key]),
            /*
            Explicit colours, not inherited.
      
            The editor is dropped onto whatever surface a host has, and a number
            field that inherits a pale text colour from a dark page renders as
            light-grey-on-white — legible in theory and not in practice. A field
            styled like a field works on either kind of page.
            */
            style: { ...FIELD_STYLE, width: '64px', textAlign: 'right' },
            onChange(evt) {
                apply(evt.target.value);
            },
        });
        row(key, 
        // A sub-grid rather than flex: `1fr 64px` puts every number field at the
        // same x, so the figures form a column you can read down.
        span({
            style: {
                display: 'grid',
                gridTemplateColumns: '1fr 64px',
                gap: '8px',
                alignItems: 'center',
            },
        }, range, num));
    }
    // Each option renders in its own face — a font menu listing names in one face
    // makes you pick by memory rather than by looking.
    row('fontFamily', select({
        style: { ...FIELD_STYLE },
        onChange(evt) {
            setW3dTheme({ fontFamily: evt.target.value });
            changed();
        },
    }, ...FONT_STACKS.map((f) => option({ value: f, style: { fontFamily: f } }, FONT_LABELS[f] ?? f.split(',')[0].replace(/"/g, '')))));
    return grid;
}
//# sourceMappingURL=theme-editor.js.map