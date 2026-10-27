# skin-shading

Skin that reads as skin without a subsurface pipeline: three cheap terms a
material plugin adds to a PBR material, lit by the scene's sun. The
[character builder](/character-builder/) uses it on every body.

- **Scatter**: light wraps a little past the shadow line, reddened, the way
  light that went into skin comes out again beside where it went in. It
  softens the terminator, which is most of what makes a lit body look like
  painted plastic.
- **Rim**: a soft lift at grazing angles, the fine hair and oil on skin.
- **Back-light**: light from behind shows through the THIN parts (ears, the
  nose, fingers), reddened. Thinness is per vertex, worked out once from the
  mesh by `skinThinness`, and carried in the vertex colour's alpha. Babylon's
  own translucency needs a thickness texture, and without one it lit the
  whole back of a torso red.

`skinShading(material, options)` attaches it and returns the plugin, whose
`scatter`, `rim` and `backlight` can be changed live. It reads the scene's
first directional light each frame (or the `sun` you give it).
