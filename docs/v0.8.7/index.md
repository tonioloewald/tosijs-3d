# 0.8.7

<!--{ "parent": "CHANGELOG", "order": 9991993 }-->

**Panels that fit.** The scene panel caps itself to the space it has, and
its sections can fold or become file tabs, captions or icons, with the
overlap and stacking of real file tabs. Land and Sky uses icon tabs and a
preset menu. Also: a security pin for a build-only dependency.

Size: barrel (min, packages external) 891.2 KB raw / 298.3 KB gz, +0.7% on
0.8.6.

## Added

- **Scene panels fit the space they have** (board #2466). The flat ⚙ panel
  is capped at the scene's height (it was a fixed 620 px, and ran off the
  bottom of a short window or a phone), re-fitted when the scene resizes;
  its own scrolling takes over. And **collapsible sections**:
  `label3d({ text, collapsible: true, open? })` heads a section that folds
  everything below it up to the next one, flat and in VR alike, with the
  open set remembered in the browser. Land and Sky's 50-odd rows fold into
  nine sections.
  Section headers are compact (a caption line, not a control row), and
  Land and Sky's preset actions (save, copy, paste) moved into a ⋯ menu
  beside the preset picker.
- **File tabs**: `tabs3d({ tabs, active, handleSelect })`, a strip where
  each tab is at most half the width with an ellipsized label; when they do
  not fit they overlap (each later tab on the one before, so every tab keeps
  its left edge), and the active one sits in front, joined to the panel
  below. Pure geometry: `tabLayout` / `tabAt`, tested. `<tosi-b3d>
  panelSections="tabs"` shows collapsible sections as tabs, one at a time
  (the chosen tab is remembered); the default stays `'fold'`. Overlapping
  tabs spread AROUND the active one: those left of it share the space
  before it (each showing its left slice), those right of it the space
  after (each its right slice), labels in the visible slice. A tab can be an
  ICON (`{ icon, title }`), and `label3d({ collapsible, icon })` gives a
  section one, which tab mode shows instead of the caption: icon tabs are
  narrow, so they sit side by side and nothing moves when you switch. Land
  and Sky uses icon tabs.
  `tabs3d` is exported (with `Tab3d`), and the widgets page has a live
  **Tabs** demo: nine captions overlapping, three side by side, icons.
