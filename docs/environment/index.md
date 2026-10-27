# environment

`studioEnvironment(scene)` gives PBR materials something to reflect: a
procedural studio, sky above, a bright horizon and a darker floor below, drawn
on a canvas and turned into the scene's environment texture. No files and
no network.

Without one, a METAL has nothing to reflect and renders nearly black, and
every PBR material loses the image-based light that rounds it out. With it,
chrome shows a sky and a horizon line, gold reads as gold, and a satin's
highlight has something to be bright about. It also lights skin and cloth a
little, so `intensity` stays modest.

```javascript
studioEnvironment(scene, { sky: '#6f8bb0', horizon: '#f2efe8', ground: '#4a4f57' })
```
