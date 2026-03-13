# TODO

## Game Engine Stuff

[ ] Tie down physics approach
[x] Aircraft Flight Model (pure force model with tests, VTOL, lateral drag, lift)
[ ] Submarine Model
[ ] Spacecraft
[x] VTOL / Helicopter (integrated into aircraft flight model)
[ ] Car (code exists, needs car mesh asset and working demo)
[ ] Biped can aim, shoot, pick up things, gesture, talk
[x] Animation Blending / State Machine (animation attribute, animationSpeed, setAnimationState)
[x] Triggers (b3d-trigger, proximity-based)
[ ] Death Persona (floating view of dead body, wrecked aircraft, etc.)

## Combat

[ ] melee
[ ] launcher -- fires ballistic or guided weapons
[ ] ballistic shots (including bombs)
[ ] guided shots -- has vision range and cone, may have a thrust budget beyond which it goes ballistic, may rely on launcher's sensors ... pit bull mode?
[ ] flame throwers
[ ] turret -- rotates and elevates to aim at target with / without computing leading
[ ] "Destroyables" -- damage capacity, regeneration, damage resistance, things that prevent it taking damage, things that take damage if it is destroyed, what happens when it is destroyed (corpse, wreck, explosion)
[ ] "Warhead" -- has a collision sphere, inflicts damage (may do AOE damage attenuated by distance).
[ ] "Shield" -- has health, regeneration, possibly has a chain reaction side-effect on failure.

## AI

[ ] Detectable (radar profile, visible profile, audio profile, smell profile)
[ ] Sensorium (generalized concept of senses and radar, has radar, vision, audio, and scent sense that have sensitivities, ranges, and these can vary by dot product with local direction vector)
[ ] AI Biped (pathfinding, awareness states, combat behavior)
[ ] AI vehicle controllers (aircraft, car, boat — follow waypoints, pursue/evade)
[ ] AI turret (acquires targets via Sensorium, leads shots)
[ ] Behavior trees or state machines for AI decision-making

## Asset Management

[x] b3d-library: LoadAssetContainer-based parts catalog with type registry and hierarchical mesh picker
[ ] Tile map component consuming libraries by type
[ ] Decorator component (place library items on terrain)

## UI

[x] Based on SVG texture (b3d-svg-plane + SvgTexture)
[x] Converts pointer actions on surface to SVG (supports hover, active states, enter, exit, and click events, uses rect hull for collision)
[x] Can be bound normally (live DOM SVG via selector, tosijs bindings update automatically)
[x] Has a specified update frequency, defaults to 30ms
[ ] Small library of svgUiComponents (not Component subclass, but in that spirit).
  [ ] button
  [ ] textInput
  [ ] toggle
  [ ] slider
  [ ] meter

## Terrain

[ ] LOD Management
[ ] 2D and 3D tile systems (see Asset Management)
[ ] Decorator (see Asset Management)
[ ] Local terrain deformers (e.g. blast craters or leveled areas for city placement)

## Effects

[ ] Cloud Layers
[ ] God Rays (through clouds and from water)
[ ] Ambient (weather, bubbles, wind, snow, lightning)
[ ] Lava
[ ] Improved water
[x] Under Surface of Water (underwater tint/fog effects)
[x] Particle Effect (b3d-particles)
[ ] Explosion (particle effect)
[ ] Thruster (particle effect)
[ ] Smoke (particle effect)
[ ] Fire (particle effect)
[x] Model exploder (b3d-exploder)
[ ] Ragdolls (maybe never, just have death animations)

## Materials

[ ] Support for the materials examples
[ ] Terrain material (per Gemini biome discussion)
[x] SVG Materials (SvgTexture + b3d-svg-plane component)
[ ] Spacebox -- like skybox but with one or more stars and outer space look.

## UI Stuff

[x] Bound SVGs that are rendered to texture and then have events routed to them (b3d-svg-plane with pointer event pass-through)
[ ] SVG Radar (lemma of above)
  [ ] Concept of lockon
[ ] Video texture / Mosaic player

## Audio Stuff

[x] Positional Sound (b3d-sound)
[ ] Music Manager
[ ] Speech synthesis

## Space Stuff

[ ] Gas giant material
[ ] Asteroid belts
[ ] Moons
[ ] Space Stations

## Utilities

[ ] Save / Load
[ ] Character Customization

## Network Multiplayer

[ ] basic state sync within contexts (e.g. same locale)

## Inventory

[ ] Inventory Management
[ ] Modify player appearance based on gear
[ ] Pick Stuff Up
[ ] Drop Stuff
[ ] Buy / Trade
[ ] Money

## Infrastructure (Done)

[x] sceneReady/sceneDispose lifecycle for all components
[x] Input abstraction (ControlInput, InputProvider, CompositeInputProvider, inputFocus)
[x] Collision detection system with convention-based collider shapes
[x] XR controller input via observable pattern
[x] Import-style demo code (rewritten at runtime by tosijs-ui)
[ ] Componentized XR camera that can be dropped into a scene and given a mode (default, pinned to named transform, etc.) which provides an enter XR button as an option, and has a simple API.

## Documentation, Examples & Tests

[ ] As much test coverage as possible (aircraft-physics: 35 tests, perlin-noise, gradient-filter, surface-sampler; auto-run on build)
[x] At least one live example for each component (most components have demos)
[ ] Documentation for each component

## Ariosto

[ ] Dynamic mission / quest system
[ ] Faction Support
[ ] World Graph Support
[ ] Story Atoms
[ ] Narrative State

## Jolt Phyics

[x] Minimal V2 compatible layer for Manta
[ ] Complete V2 compatibility and publish as separate library
[ ] Prestep and CCD support
[ ] Add ability to offload work to rust for tauri apps.

## Controllers

[x] Gamepad support for all controllers (VirtualGamepad abstraction)
[x] Gamepad control should work the same way in XR / mouse+keyboard / Gamepad / Touch (MappedInputProvider + GamepadSource)
[x] Map keyboard / mouse to standard gamepad (KeyboardGamepad)
[ ] Implement on screen "glass" gamerpad for touch contexts
[ ] Offer standard way of displaying game controls and mappings, and editing mappings

## Workflow
[ ] Blender addon that allows convenient editing of custom properties that we consume
[ ] This would automatically convert _xxx into the corresponding custom properties when selected
[ ] We would need to make corresponding changes to our import code

## Bugs

[x] Particle demo does not load
[ ] Sound demo needs hum.wav asset
[ ] In the trigger demo the pov character just falls through the world and you can see a clone left behind
[ ] In VR the b3d (main) demo often leaves a frozen clone behind when you start walking
[ ] Planet material seems pinched at one pole
[ ] Possible leaks in jolt plugin
