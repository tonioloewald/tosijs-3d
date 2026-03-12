# TODO

## Game Engine Stuff

[ ] Tie down physics approach
[ ] Aircraft Flight Model
[ ] Submarine Model
[ ] Spacecraft
[ ] VTOL / Helicopter
[ ] Car (code exists, needs car mesh asset and working demo)
[ ] Biped can aim, shoot, pick up things, gesture, talk
[x] Animation Blending / State Machine (animation attribute, animationSpeed, setAnimationState)
[ ] AI Biped
[ ] AI vehicle controllers
[x] Triggers (b3d-trigger, proximity-based)
[ ] Death Persona (floating view of dead body, wrecked aircraft, etc.)

## Combat

[ ] shooting
[ ] melee
[ ] ballistic shots
[ ] guided shots
[ ] flame throwers
[ ] AI turret
[ ] "Destroyables" -- damage capacity, regeneration, damage resistance, things that prevent it taking damage, things that take damage if it is destroyed, what happens when it is destroyed (corpse, wreck, explosion)
[ ] Damage

## Asset Management

[x] b3d-library: LoadAssetContainer-based parts catalog with type registry and hierarchical mesh picker
[ ] Tile map component consuming libraries by type
[ ] Decorator component (place library items on terrain)

## UI

[ ] Based on SVG texture
[ ] Converts pointer actions on surface to SVG (supports hover, active states, enter, exit, and click events, uses rect hull for collision)
[ ] Can be bound normally
[ ] Has a specified update frequency, defaults to 30ms

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
[ ] SVG Materials
[ ] Spacebox -- like skybox but with one or more stars and outer space look.

## UI Stuff

[ ] Bound SVGs that are rendered to texture and then have events routed to them (we'd probably stick to rectangular hulls to keep things simple)
[ ] SVG Radar (lemma of above)
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

[ ] As much test coverage as possible
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

[ ] Gamepad support for all controllers
[ ] Gamepad control should work the same way in XR / mouse+keyboard / Gamepad / Touch
[ ] Map keyboard / mouse to standard gamepad
[ ] Implement on screen "glass" gamerpad for touch contexts
[ ] Offer standard way of displaying game controls and mappings, and editing mappings

## Bugs

[x] Particle demo does not load
[ ] Sound demo needs hum.wav asset
[ ] In the trigger demo the pov character just falls through the world and you can see a clone left behind
[ ] In VR the b3d (main) demo often leaves a frozen clone behind when you start walking
[ ] Planet material seems pinched at one pole
[ ] Possible leaks in jolt plugin
