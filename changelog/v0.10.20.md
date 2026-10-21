# 0.10.20

<!--{ "parent": "CHANGELOG", "order": 9989980 }-->

## Fixed

- **An effect's SVG picture that finishes loading after its scene let it go no longer throws** (regression in 0.10.19, found by ensemble): releasing a scene's sprites with its last effect (new in 0.10.19) could dispose a picture texture before its image loaded, and the late `onload` drew on it ("Cannot read properties of null (reading 'clearRect')", uncaught). It now draws nothing; a sprite with no 2D canvas is likewise undrawn rather than a throw. A test releases the sprites before the load. A hotfix from v0.10.19: this is the only change.

Size: barrel (min, packages external) 1225.0 KB raw / 420.2 KB gz, +0.01% on 0.10.19.
