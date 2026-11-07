# undo history

A list of states and a place in it: the one undo model behind the character
builder and the rig tool. A tool records its whole state after each change that
settles (a slider drag ends, a marker is dropped, a grip is placed); undo and
redo step back and forth through what was recorded, and recording after an undo
drops the steps that were undone, as every editor does.

States are snapshots, not commands. A tool that can already save itself (a
character, a rig recipe) can therefore undo with no more code than saving takes,
and nothing has to describe how each change is reversed.

```javascript
import { undoHistory } from 'tosijs-3d'

const history = undoHistory({ limit: 100 })
history.record(state())           // the state it opened in
// … after each change settles:
history.record(state())
// Undo:
const before = history.undo()
if (before) restore(before)
```

`record` ignores a state equal to the current one (compared as JSON unless you
pass `same`), so a tool may record whenever something might have changed, and
restoring a state and then recording it does nothing. Past `limit` the oldest
steps are forgotten.

Pure: no DOM, no Babylon.
