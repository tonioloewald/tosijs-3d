# widget semantics

**What a panel control IS, as well as how it draws.** Every `Widget3d` may
say what it is through `semantics()`: a role (button, toggle, slider,
select, text box, …), its accessible NAME, its value, and how to set or
press it through its own path, exactly as a hand on it would. A panel's
widgets then read as a tree of named controls, which is what an agent's
tools, a screen reader's mirror and the panel name test all read.

```javascript
import { controlTree, findControl, nameProblems } from 'tosijs-3d/widget-semantics'
const tree = panel.controls()               // a Panel3d's rows, header and open popups
findControl(tree, 'Sky/time of day').node.set(18)
findControl(tree, 'Character/save…').node.activate()
nameProblems(tree)                          // [] when every control has a unique name
```

A control is addressed by its PATH: the names of the sections and groups
above it and its own, joined by `/`. Sections (`label3d({ collapsible })`)
are levels, and a closed section still lists its name (activate it to open
it, then read the tree again). A popup that is open is a level named after
the control that opened it.

**Names.** A control's own label first. A control with none (an input field)
takes the label beside it in the same row, then its placeholder, then the
label or text just above it. An interactive control with no name, one named
only by a glyph (`⋯`), or two with the same path, is what `nameProblems` reports: icons first, but never
nameless.

Pure: no DOM, no Babylon. The widgets implement `semantics()`; this module
only reads it.
