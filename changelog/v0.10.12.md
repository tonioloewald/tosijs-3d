# 0.10.12

<!--{ "parent": "CHANGELOG", "order": 9989988 }-->

## Added

- **A system panel's content can be rebuilt in place** (#111, from ensemble): system panels are now identified by their `<tosi-b3d-panel>` element, not by the SVG it shows. Setting `el.svg = next` on an open one shows the new content where it was, with the same system-bar button, the same dragged spot (flat and in a headset) and its open state, refitted to the new height. A closed one shows it when next opened. Before, a host that rebuilt its `panel3d` got a second button, lost the spot, and the open panel kept the old content. The setter fires a bubbling `panelcontent` event; disposing the dropped content stays the host's job.
- **`stretch` on a destroyable: a per-axis scale applied when the library piece arrives** (#105, the rest of it): `stretch="2 1 3"` multiplies `scale` per axis. A stretch written on the node by hand before the instance existed was lost when it loaded (ensemble measured 6.036 wide where 18.108 is right); as an attribute it is applied on adoption, like `scale`. A hand-set scaling still survives renders until `scale` or `stretch` changes.

Size: barrel (min, packages external) 1154.3 KB raw / 395.0 KB gz, +0.06% on 0.10.11.
