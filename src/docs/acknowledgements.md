# Acknowledgements

<!--{"order": 920, "pin": "bottom"}-->

tosijs-3d stands on other people's work: models, maps, measurements, icons,
libraries and ideas. Most of it was given away with no conditions at all
(CC0, public domain), and is credited here anyway, because someone made it.

## Corrections and takedowns

If something here is yours and the credit is wrong or missing, or you want it
taken down, post in the feedback channel on the
[tosijs Discord](https://discord.gg/ramJ9rgky5) and say what it is and where
it appears. We will fix the credit, or remove the
content from this site and from the asset CDN (`cdn.tosijs.net`), promptly and
without argument.

Every file the CDN serves carries its credit and licence in its own HTTP
headers, so a file found on its own still says where it came from.

## Models and characters

- **[Kenney](https://kenney.nl)**: the game kits (vehicles, buildings, props,
  characters) the demos are built from. CC0. Kenney's work is free; buying the
  bundle pays for more of it.
- **[Quaternius](https://quaternius.com)**: the Universal Animation Library
  (the clips every rigged character plays), the mannequins, characters,
  hairstyles and the nature library (trees, rocks, plants) the terrain is
  decorated with. CC0.
- **[MakeHuman](http://www.makehumancommunity.org)**: the base body, its
  shape targets, eyes, expressions and clothes behind the character builder,
  converted from MakeHuman's own assets. CC0 since 2020. None of MakeHuman's
  (AGPL) code is used.
- **[Blender Studio and community contributors](https://www.blender.org/download/demo-files/#assets)**
  (Blender Foundation): the Human Base Meshes, four bodies, realistic and
  stylized, for rigging any mesh. CC0.
- **[The Base Mesh](https://www.thebasemesh.com)**: the teapot material
  previews are drawn on, and the globe. CC0.
- **Tonio Loewald**: omnidude, the weasels, the space marine and the other
  meshes under `cdn.tosijs.net/tonio/`.
  [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

## Sound

- **Tonio Loewald**: the hum the sound demo plays, made with
  [Suno](https://suno.com).

## Maps and measurements

- **[NASA](https://www.nasa.gov/nasa-brand-center/images-and-media/)**, used
  under NASA's media guidelines (credit does not imply endorsement):
  - Earth: [Blue Marble Next Generation](https://earthobservatory.nasa.gov/features/BlueMarble)
    (Reto Stöckli, NASA Earth Observatory) and Black Marble 2016 night lights
    (Joshua Stevens, from Suomi NPP VIIRS data by Miguel Román, NASA GSFC); its
    elevation image is derived from GEBCO.
  - Mars: Viking MDIM 2.1 colour mosaic (NASA/JPL/USGS, via
    [Mars Trek](https://trek.nasa.gov/mars/)) and MGS MOLA elevation (PDS
    Geosciences Node).
  - The Moon: the [CGI Moon Kit](https://svs.gsfc.nasa.gov/4720/), NASA's
    Scientific Visualization Studio, from LRO LOLA elevation and LROC WAC
    colour.
- **[NOAA NCEI](https://www.ncei.noaa.gov/products/etopo-global-relief-model)**:
  Earth's relief, land and sea floor, from the ETOPO 2022 Global Relief Model
  ([doi:10.25921/fd45-gt74](https://doi.org/10.25921/fd45-gt74)). CC0. Not for
  navigation.
- **The [Monk Skin Tone Scale](https://skintone.google)** (Dr. Ellis Monk and
  Google): the ten tones the skin dial runs through.
  [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

## Icons

- **[Feather](https://feathericons.com)** (Cole Bemis): most of the stroked
  icons. MIT.
- **[Lucide](https://lucide.dev)** (Lucide Contributors): the standing figure
  and the backpack on the inventory. ISC.

## Software

- **[Babylon.js](https://www.babylonjs.com)**: the engine everything here
  draws with. Apache 2.0.
- **[Jolt Physics](https://github.com/jrouwe/JoltPhysics.js)** (Jorrit Rouwe):
  physics. MIT.
- **[fflate](https://101arrowz.github.io/fflate)** (Arjun Barrett): the
  compression inside the PNG encoder. MIT.
- **[Blender](https://www.blender.org)** (Blender Foundation): converts the
  model packs for the CDN. GPL; nothing of Blender ships.

## Ideas

- Binding a mesh to its skeleton by bone heat: Ilya Baran and Jovan Popović,
  [Automatic Rigging and Animation of 3D Characters](https://people.csail.mit.edu/ibaran/papers/2007-SIGGRAPH-Pinocchio.pdf)
  (SIGGRAPH 2007).
- Hair and tails that do not stretch: Matthias Müller et al., follow-the-leader
  correction, in
  [Fast Simulation of Inextensible Hair and Fur](https://matthias-research.github.io/pages/publications/FTLHairFur.pdf)
  (2012).
- Fitting clothes to any body: MakeHuman's proxy binding, three body vertices
  and an offset per garment vertex.
