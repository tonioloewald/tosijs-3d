# Widget layout maths

Pure layout math for [[widgets3d]] — no tosijs, no DOM, no Babylon, so it is
directly unit-testable. The widget collection imports these helpers to stack
its children and decide when a panel must scroll.

The layout model: a container has a fixed content width. It hands that width to
each child, each child reports the height it needs, and the container stacks
them top-to-bottom with a gap. If the stack is taller than the viewport, the
container scrolls.

## Example

Pure helpers [widgets3d](?widgets3d.ts) calls internally — no scene of their own:

```javascript
import { stackLayout, measureTextWrap, cssFont } from 'tosijs-3d'

// stackLayout(children, opts) → arranges a column: each child reports its height, they stack
// top-to-bottom with a gap, and it returns the total height (+ whether it overflows → scroll).
//
// measureTextWrap(text, width, cssFont(spec)) → breaks a paragraph into lines by REAL glyph
// measurement (canvas measureText), not a guessed character count, so an SVG panel wraps where
// the text actually overflows. See <tosi-b3d-panel> / widgets3d for the assembled panels.
```
