# skin-tone

A skin's colour from one dial, very fair (0) through to very dark (1), plus
a `redness` dial for undertone. Pure: no Babylon, so a recipe's skin can be
checked or previewed headless. The [character builder](/character-builder/)
paints its body with it.

The dial runs through the ten tones of the **Monk Skin Tone Scale**
(Dr. Ellis Monk and Google, [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/),
[skintone.google](https://skintone.google)), chosen because it was built to
cover the range of real skin evenly, the dark end included. Between two tones
it blends in linear light, as paint would mix, not in sRGB.

The scale's colours are swatches, meant to be SEEN on a screen, and they are
nearly neutral: tone 1 reflects only 18% more red than blue. Skin measured as
a surface is far warmer (fair skin about 1.7 times as much red as blue,
because blood under it absorbs blue and green), and a body painted with the
swatches looks grey and bloodless. So `skinAlbedo`, the colour for a
material, takes only each tone's LIGHTNESS from the scale, at a plausible
reflectance (fair skin reflects about 60% of red light, not 90%), and gives
it skin's own warmth: pinker at the fair end, more golden in the middle,
and nearly white at the very end (porcelain). `redness` is gentle near its
middle and strong at its ends: 0 drains the skin to a grey-white (a vampire,
or a goth's powder), 1 is flushed.
`skinColor` is the scale's swatch, for a UI.

IRIS colour is a dial too: `irisColor(t)` runs from dark brown through
brown, hazel, green and blue to grey, the order real eyes come in from most
melanin to least.

HAIR is two pigments too: `hairColor(light, red)` runs black to platinum,
with red from none to copper.

```javascript
hairColor(0.2, 0.8)   // auburn, linear
irisColor(0.6)        // green-blue, sRGB 0..1
skinColor(0)          // the scale's tone 1, sRGB 0..1
skinColor(1)          // tone 10
skinAlbedo(0.5, 0.6)  // a mid tone, a little ruddy, linear, for a material
```
