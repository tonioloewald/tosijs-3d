# test checklist in the scene

When an agent asks a person to check something
(`tosijs-checklist post checks.json`, from tosijs-ui), every page the dev
server serves shows a badge and a panel to answer it in. That panel is HTML, so
in a headset it is gone. This module puts the same list on a `<tosi-b3d>`'s
system bar: a ✓ button that blinks when a list arrives. It opens a panel with a
👍 and 👎 and a comment field (the scene keyboard) for each item, flat and in a
headset. Each answer is saved as it is given, through the same endpoint the
page's panel uses, so the two stay in step.

Nothing to wire. A `<tosi-b3d>` watches for a list only on a page served by a
dev server with the checklist endpoint (tosijs-ui ≥ 1.19), so a deployed site
does nothing and fetches nothing. In an app with its own server mounting
`checklistHandler`, call `setChecklistEndpoint` (exported here, as tosijs-ui's
client does for the page's panel) before the scene connects.

A verdict from the scene carries a schematic that says it was given in a scene,
and in a headset if it was: the page's own schematic draws HTML, and a headset
shows none of it.

`checklistPanel(state, handleAnswer)` builds the panel's content on its own,
for a host that places it somewhere else.
