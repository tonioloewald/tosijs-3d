# 0.10.11

<!--{ "parent": "CHANGELOG", "order": 9989989 }-->

## Added

- **A table can show its selection as the row** (#109, from ensemble): `selectionMarker: 'row'` fills the selected row and drops the radio/checkbox column, for rows that carry a leading control of their own (two circles side by side read as one toggle that did not work). Selection, `handleSelect` and the D-pad path are unchanged. A rebuilt table can start with `selected` or take `setSelected(ids)` (neither calls `handleSelect`), and `revealRow(id)` scrolls its own body to a row.
- **A panel's scroll position can be read, set, and aimed at a row** (#110, from ensemble): `Panel3d` gains `scrollTop` (get/set, clamped), so a host that rebuilds a panel keeps its place, and `reveal(widget, band?)`, which scrolls the least that brings a row into view (`panel.reveal(table, table.rowBox(id))` for one table row). Coordinate-based, so it works in a headset, where the host has no DOM to measure.

Size: barrel (min, packages external) 1153.7 KB raw / 394.8 KB gz, +0.08% on 0.10.10.
