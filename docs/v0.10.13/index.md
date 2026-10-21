# 0.10.13

<!--{ "parent": "CHANGELOG", "order": 9989987 }-->

## Fixed

- **Overlapping screen panels: the one drawn on top is the one you press** (#115, from ensemble). Every screen-pinned panel sat at the same distance, and on a tie Babylon draws the later mesh on top but picks the first, so a press in an overlap went to the panel underneath. It showed up as a system panel whose content was swapped for something taller: reopened, it was drawn over its neighbour, and every row over the neighbour ignored the pointer. Screen panels in a layer now stack: newest on top, and a press or a title-bar grab brings a panel to the front, with drawing and picking taken from the same order.
- **The wheel over an in-scene panel scrolls the panel** (#114, from ensemble), instead of zooming the camera behind it; trackpad two-finger scroll too. A panel that cannot scroll still takes the wheel, so the scene does not zoom under a pointer that is on the UI. `titled3d` passes `scrollBy`, `scrollTop` and `scrollable` through to its content.
- `iconGrid3d` hovers inside a panel. It listened for `move`, and a panel reports an unpressed pointer as `hover`, so its cells never lit.

## Added

- **Tooltips for icon-only controls, wherever the panel is drawn** (#112, from ensemble): `IconGridItem` takes a `title`, shown on hover (a mouse, or a controller ray in a headset) and on D-pad focus. The panel draws it over its body, so a bottom row's tip is not clipped, flipped above the control when there is no room below. `iconBar3d` uses the same tip. A custom widget gets one through `WidgetHost.showTip`/`hideTip`.
- **A test can click a system panel's content where a person would** (#113, from ensemble): `el.contentToClient(x, y)` gives the client pixel of a point of the content (its viewBox units), through the drawn plane, so a drag, a scale and the title bar are accounted for; `el.clientRect()` is the content's box. Null unless open and flat.
- **A host can re-stack its system panels**: until someone drags a system panel, its spot is its current `screenAnchor`, so setting a new one moves an open panel (a column re-stacked as the panel above it grows). A dragged panel keeps its spot until its button is held. `screenAnchorDragged(anchor)` is exported.

Size: barrel (min, packages external) 1158.1 KB raw / 396.3 KB gz, +0.33% on 0.10.12.
