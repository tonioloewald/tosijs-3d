# Design notes

<!--{"order": 910, "pin": "bottom"}-->

Remarks of Tonio Loewald's that decided how something works. The reference
pages say what is true now and why; this page keeps the original words, with
a line on what each one settled and a link to the page it shaped.

## Interfaces

- _"We need popups to be popups and not constrained by the thing that pops
  them. Otherwise the user experience is terrible."_ A popup is its own
  surface in front of its opener, never cropped inside it
  ([popup-surface](/popup-surface/)).
- _"Parenting in 3d is merely positional and not cropping."_ So a popup can
  be parented to its opener in a scene, where a DOM portal could not
  ([popup-surface](/popup-surface/)).
- _"We shouldn't make special size allowances for XR UI targets, we should
  scale XR so that pointer or touch targets make sense, since XR users also
  need to be able to read stuff."_ A headset scales the panel, not the
  targets ([icon-grid](/icon-grid/)).
- _"Panel dragging seems simple enough. Drag it on the surface of a sphere
  around its rig anchor."_ And for its limits: _"It could follow you and
  rubber band back."_ ([frame-panel](/frame-panel/)).
- _"Use the same approach for all our panels as it will also allow
  translucent themes."_ Popups are drawn like every other panel, blended but
  still ordered by depth ([frame-panel](/frame-panel/)).
- _"Simple things like XYZ coords take up huge amounts of space."_ A
  coordinate takes one row ([vector-field](/vector-field/)).
- _"The footprint would work MUCH better as a radial editor. A hexagon would
  just be a hexagon."_ ([footprint-field](/footprint-field/)).
- _"Select move rotate scale, where scale turns off move and rotate, and move
  and rotate turn off scale but can coexist and select is independent."_ The
  tool-palette rule: the grid owns layout, the consumer owns meaning
  ([icon-grid](/icon-grid/)).
- _"The intensity slider goes from 0 to 1000 with very little wiggle-room in
  0-1."_ The case for log sliders ([widgets3d](/widgets3d/)).
- _"The theme editor seems to change the global theme and infects other
  demos."_ Said from a headset; the editor restores the palette when you
  leave ([w3d-theme](/w3d-theme/)).
- _"Presumably we need to be able to configure the light's basic properties
  (like its basic color, intensity, whether it casts shadows, the type of
  light, and so on, or we've only done half the job."_ The lamp editor edits
  the whole lamp ([b3d-lamp](/b3d-lamp/)).

## Curves and light

- _"Let's assume we don't allow mapping outside of `[0,1]` and instead scale
  the terrain block to avoid playing badly with carving."_ A curve's range is
  closed; amplitude belongs to the block ([curve-field](/curve-field/)).
- _"The attack and decay should be shared by the various curves or it just
  becomes nutty."_ A light program's curves share one pair of markers
  ([curve-program](/curve-program/)).
- _"If one curve covers attack - sustain - decay and you simply move the
  point where attack becomes sustain and sustain becomes decay then the only
  real discontinuities will occur mid-loop shut off or shut off while
  spinning up."_ One curve per channel, two markers
  ([light-modulation](/light-modulation/)).
- _"You might not want flicker to compose. The classic fluorescent light
  flickers to life. And if you want the lamp to flicker as it dies, make it
  flicker as it dies."_ Flicker does not compose across regions; draw the tail
  you want ([light-modulation](/light-modulation/)).
- _"The light that looks red doesn't seem to produce red light."_ So the
  dying fluorescent holds an ember ([b3d-lamp](/b3d-lamp/)).
- _"Can we do gels on point lights … if I wanted to make a lamp shaped like
  it's behind a grill like an old lantern?"_ Model the grill; a point light
  takes no gel ([b3d-lamp](/b3d-lamp/)).

## Sky, weather and worlds

- _"What we have is not worthy of everything else we've got. It looks like a
  child's cartoon next to everything else."_ On seeing the blob clouds from
  both sides in a rocket. That is why the cloud deck exists
  ([b3d-cloud-deck](/b3d-cloud-deck/)).
- _"If we use a bunch of quads we can use the vertex channels to drive
  localized weather effects later. Or have clouds that cluster near mountains
  say."_ The deck is a grid, and orographic cloud uses its channels
  ([b3d-cloud-deck](/b3d-cloud-deck/)).
- _"Having a single decal (even if it has less coverage) that is driven by
  the cloud shader logic seems like a performance and appearance win."_ The
  cloud shadow reads the deck's own field ([b3d-cloud-deck](/b3d-cloud-deck/)).
- _"Vectors sum fine don't they?"_ Wind is a vector inside and degrees at the
  edge ([wind](/wind/)).
- _"Given a starfield background is a very specific kind of image I imagine
  we could encode something very efficient in say a 512 or 1024 map by
  treating the values as data."_ The origin of the encoded sky
  ([starfield-codec](/starfield-codec/)).
- _"Almost any star system with planets … is going to have a ball of rock
  someone can plant a flag on."_ So a rocky planet alone does not make a star
  interesting ([b3d-galaxy](/b3d-galaxy/)).
- _"If you change the rules for star system generation expecting things not
  to change is bizarre."_ A star's address may move when the rules change
  ([b3d-galaxy](/b3d-galaxy/)).

## Crowds and animation

- _"I don't really care if my 200 soldiers are a little jerky."_ Soldiers
  bake at a low rate, without interpolation
  ([vertex-animation](/vertex-animation/)).
- _"We have a fallback to handle things like flocks of birds flying around in
  the background, or swarms of insects etc. It's very nice to have, and we
  should definitely keep the infrastructure we built."_
  ([vertex-animation](/vertex-animation/)).
- _"The winged creature is probably more like a dragon and has a slow
  majestic flap."_ A bake's rate follows motion on screen, not the clip's
  speed ([b3d-crowd](/b3d-crowd/)).
- _"A dragon unit will likely be ONE figure or maybe three."_ Unit size
  decides between a crowd and skinned rigs ([b3d-crowd](/b3d-crowd/)).
- _"I think we'd leave the rules for switching to skinned models to the
  consumer since it will be more likely decided on specifics."_ When a crowd
  figure becomes a rig is the consumer's policy ([b3d-crowd](/b3d-crowd/)).
- _"I imagine things like collision detection and so on could vastly
  outweigh the animation costs."_ The crowd bench measures rendering only
  ([b3d-crowd](/b3d-crowd/)).
- _"In the original game the figures were walking on a virtual game board
  and basically offset within a square, so basically collision detection was
  just were you trying to enter an occupied square."_ Grid occupancy, from the
  Amiga original.

## Characters and weapons

- _"When you swim to the water's edge, you just pop instantly to the surface
  onto the land."_ That led to mantling as a general verb rather than a swim
  exit ([b3d-biped](/b3d-biped/)).
- _"The same sort of correction could handle the medium boundary issue."_ The
  wall correction and the waterline band are one camera model
  ([b3d-biped](/b3d-biped/)).
- _"Technically not hard, but having it not look terrible is a whole other
  thing."_ On layered animation, the constraint the bone mask is built around
  ([animation-layers](/animation-layers/)).
- _"I collided with wreckage high up … the wrecked plane hanging in mid-air
  (it should really tumble to the ground)."_ Said from a headset; wreckage
  falls ([b3d-death](/b3d-death/)).
- _"Fine tuning the gun's position by typing is horrible :)"_ So Weapon Fit
  uses a drag gizmo ([weapon-fit](/weapon-fit/)).
- _"A real gun would have fingers wrapped and spread around it. When I model
  the actual weapons — or adapt others' models — I should make the grips a
  little narrower so they don't look weird."_
  ([b3d-launcher](/b3d-launcher/)).

## Content

- _"Making all this cheaply discoverable would facilitate piracy and it's not
  my content."_ A library's catalogue lives inside its GLB; the CDN has no
  index ([glb-manifest](/glb-manifest/)).
