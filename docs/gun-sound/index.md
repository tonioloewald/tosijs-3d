# gun-sound

**A shot you hear**, synthesised: no files. `gunshot(scene, at, kind)` plays
one at a world position: a crack of filtered noise and a low thump, each
falling away fast, through a panner placed at the muzzle (the listener is
put where the camera is first). `kind` picks a profile:

| kind | sounds like |
|---|---|
| `pistol` | a sharp crack, little body |
| `rifle` | louder, longer, with a deep thump and a tail |
| `heavy` | a launch: a soft boom and a long whoosh |
| `bow` | a twang: a plucked string, no noise |

`<tosi-b3d-launcher sound="rifle">` plays one on every `fire()`. Like every
effect voice, nothing plays until the page has had a user gesture.
