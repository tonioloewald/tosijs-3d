/*#
# icon-name

Pure parsing of the **icon composition suffix grammar** — the tail modifiers that
[[svg-icons]] applies to a base icon name (`chevron90r`, `close_ff0000S`,
`camera50o`). No tosijs, no DOM: just string → a plain style object, so it is
unit-tested headless (like [[fly-by-wire]] / [[perlin-noise]]).

This is a deliberate **subset** of tosijs-ui's `icons` proxy grammar — the
*style suffixes* only. It does NOT implement `$` stacking or the rule-prefixes
(`spin`, `un`, `check`, `search`), which compose/overlay multiple icons.

## Suffix codes

A suffix is `<value><code>`, chained, at the end of a name. `_` prefixing the
value means negative; a name ending in a digit needs a `_` separator
(`edit2_50o`).

| code | effect                    | example      |
| ---- | ------------------------- | ------------ |
| `r`  | rotate N°                 | `chevron90r` |
| `f`  | flip (`0f` = H, `1f` = V) | `chevron0f`  |
| `s`  | scale N%                  | `star75s`    |
| `x`  | translateX N%             | `plus20x`    |
| `y`  | translateY N%             | `plus_10y`   |
| `o`  | opacity N%                | `camera50o`  |
| `W`  | stroke-width N            | `chevron3W`  |
| `F`  | fill (hex or `--var`)     | `close_f00F` |
| `S`  | stroke (hex or `--var`)   | `chevron_accentS` |
*/
// Trailing run of style suffixes. Mirrors tosijs-ui's SUFFIX_RE: transform/opacity
// codes must follow a letter or `_` (so digits inside a name aren't eaten), color
// suffixes are `_<hexOrVar><F|S>`.
const SUFFIX_RE = /(?:(?<=[a-zA-Z_])(?:_?\d+[osxyr]|[01]f|\d+W)|_[a-zA-Z0-9]+[FS])+$/;
const SUFFIX_TOKEN_RE = /_?\d+[osxyr]|[01]f|_[a-zA-Z0-9]+[FS]|\d+W/g;
/**
 * Split a name into its base + the style implied by its trailing suffixes.
 * Returns `null` if there are no suffixes (or nothing before them) — the caller
 * then treats the whole string as a plain icon name.
 */
export function parseStyleSuffixes(name) {
    const match = name.match(SUFFIX_RE);
    if (!match || match.index === undefined)
        return null;
    let baseName = name.slice(0, match.index);
    // A trailing `_` separator (digit-ending base like `edit2_50o`) isn't part of the name.
    if (baseName.endsWith('_'))
        baseName = baseName.slice(0, -1);
    if (!baseName)
        return null;
    const tokens = match[0].match(SUFFIX_TOKEN_RE);
    if (!tokens)
        return null;
    const style = {};
    const transforms = [];
    for (const s of tokens) {
        const code = s[s.length - 1];
        if (code === 'F' || code === 'S') {
            const raw = s.slice(1, -1);
            const isHex = /^[0-9a-fA-F]{3,8}$/.test(raw);
            // Named colors resolve to a CSS custom property (matches tosijs var naming).
            const value = isHex ? '#' + raw : `var(--${raw})`;
            if (code === 'F')
                style.fill = value;
            else
                style.stroke = value;
        }
        else if (code === 'W') {
            style.strokeWidth = s.slice(0, -1);
        }
        else {
            const val = parseInt(s.replace('_', '-'), 10);
            switch (code) {
                case 'o':
                    style.opacity = String(val / 100);
                    break;
                case 's':
                    transforms.push(`scale(${val / 100})`);
                    break;
                case 'x':
                    transforms.push(`translateX(${val}%)`);
                    break;
                case 'y':
                    transforms.push(`translateY(${val}%)`);
                    break;
                case 'r':
                    transforms.push(`rotate(${val}deg)`);
                    break;
                case 'f':
                    transforms.push(val === 0 ? 'scaleX(-1)' : 'scaleY(-1)');
                    break;
            }
        }
    }
    if (transforms.length > 0) {
        style.transform = transforms.join(' ');
        style.transformOrigin = '50% 50%';
    }
    return { baseName, style };
}
/**
 * Merge a suffix-derived style into an accumulator (for layered resolution —
 * a redirect target may carry its own suffix, e.g. `arrowUpRight90r`). Transforms
 * concatenate; scalar props are first-writer-wins so the outermost (caller's)
 * suffix takes precedence over an inner redirect's.
 */
export function mergeIconStyle(into, add) {
    if (add.transform) {
        into.transform = into.transform
            ? `${into.transform} ${add.transform}`
            : add.transform;
        into.transformOrigin = '50% 50%';
    }
    for (const k of ['opacity', 'fill', 'stroke', 'strokeWidth']) {
        if (add[k] !== undefined && into[k] === undefined)
            into[k] = add[k];
    }
}
/*{ "parent": "Utilities" }*/
//# sourceMappingURL=icon-name.js.map