# Changelog

<!--{ "parent": "upgrading", "order": 20 }-->

All notable changes to **tosijs-3d**, one page per version: each lives in
`changelog/v<version>.md` (on the site at `/v<version>/`), and this page is the
index: the latest release below, then every version, newest first (that list is
generated from each page's `parent`). This project is pre-1.0 (`0.x`), so minor
versions may carry breaking peer-dependency changes. Each is called out in a
**⚠️ Breaking** block on its version's page, with what a consumer must do.
Upgrading across a minor? Start with [Migration](/Migration/).

## Unreleased

- **Fixed:** `<tosi-b3d-light>` applies its attributes when its light is made. Before, a light whose element rendered before the scene was ready kept Babylon's defaults (intensity 1, a black ground colour) whatever it was given, so a page that hit it (the character builder did) now gets the fill it asked for. The demos that set a very dim fill (colour picker, beacon, solar system, planet) render exactly as before: they were not hit.
- **Fixed:** hair is matched to the head it was modelled on by how closely it hugs that head (the crown rule put Balding on the wrong one), and every vertex keeps its height above the skin (`skinGaps`, `keepHeight`), so beards are as thick on the chin as on their own head; a face is fitted with one scale (`fitToScalp`'s `scaling: 'uniform'`), since a stylised face's flatter depth squashed beards back.
- **Added:** `skinShading` (`skin-shading`), a PBR material plugin for skin: a reddened, softened terminator (scatter), a grazing rim, and back-light through thin parts (ears, nose, fingers) from `skinThinness`, a per-vertex thinness carried in the vertex colour's alpha (`lipTint` takes it). `skinMaterial` turns it on (`shading: false` for plain PBR) and is a little glossier (roughness 0.42).
- **Added:** hair shading (a highlight band along the strands from PBR anisotropy, a sheen rim) and dye: `hairDye(natural, hue, saturation)` and `HairMaterial.setHair(light, red, { hue, saturation })` turn the natural colour toward a hue at the hair's own lightness (blue over dark hair is blue-black, pink over bleached hair pastel). The builder has dye hue and strength sliders.
- **Added:** CLOTHING. `proxy-fit` is MakeHuman's `.mhclo` binding (three base vertices, weights and an axis-scaled offset per vertex), so a garment follows every body shape with no per-body fitting: `fitProxy`, `drawnPositions`, `proxyWeights` (skin weights from the vertices it is bound to), `nearestWeights` (for the helper vertices clothes bind to), `coveredTriangles`. `human-proxy` puts one on a built body, skinned to its skeleton: `humanProxy`, `proxyMaterial`, `coverBody` (hides covered skin). The human pack (`?v=5`) carries MakeHuman's CC0 system assets as proxies: 20 suits and shoes, a fedora, 10 hairstyles and 12 brows (`pack.proxy(name)`). The builder has outfit, shoes and hat menus, MakeHuman's hair and brows beside Quaternius', and beard nudges.
- The character builder has a gridded floor that takes the sun's shadow, and an eye colour slider under its own heading.

- **Changed:** hair is carried from the head it was modelled on, skin to skin (`headScalp` now warps the library's own heads, carried in the hairstyles library as of `?v=2`; `shellWarp`, `applyWarp`, `headRegion`), instead of fitting a buzz cut to the scalp, which sank every style by its own thickness. Women's styles use Quaternius' female head, brows are placed from the eyes, moustaches above the lip, and `nudge` adjusts a style by hand. `headScalp`'s arguments and `HeadScalp` changed; `humanHair` and `placeHair` take the piece's `head` (`library.headFor(name)`).

## 0.11.4

The latest release. A character creator on MakeHuman's CC0 body: shape a
person with sliders, give them skin, eyes and hair, and watch them walk with
UAL's clips. [Read 0.11.4](/v0.11.4/).

## Every version

<!-- toc -->
- [0.11.4](/v0.11.4/)
- [0.11.3](/v0.11.3/)
- [0.11.2](/v0.11.2/)
- [0.11.1](/v0.11.1/)
- [0.11.0](/v0.11.0/)
- [0.10.20](/v0.10.20/)
- [0.10.19](/v0.10.19/)
- [0.10.18](/v0.10.18/)
- [0.10.17](/v0.10.17/)
- [0.10.16](/v0.10.16/)
- [0.10.15](/v0.10.15/)
- [0.10.14](/v0.10.14/)
- [0.10.13](/v0.10.13/)
- [0.10.12](/v0.10.12/)
- [0.10.11](/v0.10.11/)
- [0.10.10](/v0.10.10/)
- [0.10.9](/v0.10.9/)
- [0.10.8](/v0.10.8/)
- [0.10.7](/v0.10.7/)
- [0.10.6](/v0.10.6/)
- [0.10.5](/v0.10.5/)
- [0.10.4](/v0.10.4/)
- [0.10.3](/v0.10.3/)
- [0.10.2](/v0.10.2/)
- [0.10.1](/v0.10.1/)
- [0.10.0](/v0.10.0/)
- [0.9.0](/v0.9.0/)
- [0.8.15](/v0.8.15/)
- [0.8.14](/v0.8.14/)
- [0.8.13](/v0.8.13/)
- [0.8.12](/v0.8.12/)
- [0.8.11](/v0.8.11/)
- [0.8.10](/v0.8.10/)
- [0.8.9](/v0.8.9/)
- [0.8.8](/v0.8.8/)
- [0.8.7](/v0.8.7/)
- [0.8.6](/v0.8.6/)
- [0.8.5](/v0.8.5/)
- [0.8.4](/v0.8.4/)
- [0.8.3](/v0.8.3/)
- [0.8.2](/v0.8.2/)
- [0.8.1](/v0.8.1/)
- [0.8.0](/v0.8.0/)
- [0.7.8](/v0.7.8/)
- [0.7.7](/v0.7.7/)
- [0.7.6](/v0.7.6/)
- [0.7.5](/v0.7.5/)
- [0.7.4](/v0.7.4/)
- [0.7.3](/v0.7.3/)
- [0.7.2](/v0.7.2/)
- [0.7.1](/v0.7.1/)
- [0.7.0](/v0.7.0/)
- [0.7.0-rc.1](/v0.7.0-rc.1/)
- [0.6.2](/v0.6.2/)
- [0.6.1](/v0.6.1/)
- [0.6.0](/v0.6.0/)
- [0.5.2](/v0.5.2/)
- [0.5.1](/v0.5.1/)
- [0.5.0](/v0.5.0/)
<!-- /toc -->
