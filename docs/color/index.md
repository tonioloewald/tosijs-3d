# color

**The colour model behind [[color-field|color3d]] — parsing, conversion and
canonical formatting.** Pure: no DOM, no Babylon, so a consumer can validate a
document's colours in a headless runner. Same split as a lamp's settings and
editor in [[b3d-lamp]], and the curve model behind [[curve-field]].

## Why HSV and not HSL

A picker is a saturation×value SQUARE under a hue strip, and that square is HSV.
HSL's lightness puts white and black at both ends of the axis with the pure hue
stranded in the middle, so the square becomes a diamond of unreachable corners —
you cannot drag to white without also losing saturation. HSV puts white at one
corner, black along an edge, and the pure hue at the opposite corner, which is
the shape of every picker anyone has used.

`lightEditor3d` deliberately does NOT use this: a light has hue and saturation
but its VALUE is intensity, so a third axis there would be two controls for one
quantity. That is a property of lights, not of colour.

## Alpha is part of the colour, not beside it

Half this library's palette is `rgba()` — `w3d-theme`'s `panelBg` is
`#14161cf0`. A colour type that drops alpha forces every consumer to carry a
second field and reunite them at the end, and they will disagree eventually.

## Tolerant in, canonical out

Parsing accepts what people and stylesheets actually write — `#abc`, `#aabbcc`,
`#aabbccdd`, `rgb()`, `rgba()`, and named CSS colours it can resolve without a
DOM. Formatting emits ONE shape: `#rrggbb`, or `#rrggbbaa` when alpha is not
fully opaque. That asymmetry is deliberate — a document that round-trips through
an editor should not churn its bytes because someone typed `#ABC`.
