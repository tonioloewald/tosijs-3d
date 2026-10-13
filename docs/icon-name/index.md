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
