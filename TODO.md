# TODO

## Game Engine Stuff

[ ] Tie down physics approach
[ ] Aircraft Flight Model
[ ] Submarine Model
[ ] Spacecraft
[ ] VTOL / Helicopter
[ ] Car
[ ] Biped can aim, shoot, pick up things, gesture, talk
[ ] Animation Blending / State Machine
[ ] AI Biped
[ ] AI vehicle controllers
[ ] Triggers (proximity)
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

## Terrain

[ ] LOD Management
[ ] 2D and 3D tile systems
[ ] Decorator (pin boulders, trees, etc)
[ ] Local terrain deformers (e.g. blast craters or leveled areas for city placement)

## Effects

[ ] Cloud Layers
[ ] God Rays (through clouds and from water)
[ ] Ambient (weather, bubbles, wind, snow, lightning)
[ ] Lava
[ ] Improved water
[ ] Under Surface of Water
[ ] Particle Effect
[ ] Explosion (particle effect)
[ ] Thruster (particle effect)
[ ] Smoke (particle effect)
[ ] Fire (particle effect)
[ ] Model exploder (split a model into chunks and toss them around)
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

[ ] Positional Sound (including moving)
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

## Documentation, Examples & Tests

[ ] As much test coverage as possible
[ ] At least one live example for each component
[ ] Documentation for each component

## Ariosto

[ ] Dynamic mission / quest system
[ ] Faction Support
[ ] World Graph Support
[ ] Story Atoms
[ ] Narrative State

## Jolt Phyics

[ ] Minimal V2 compatible layer for Manta
[ ] Complete V2 compatibility and publish as separate library
[ ] Prestep and CCD support
[ ] Add ability to offload work to rust for tauri apps.

## Bugs

[ ] Particle demo does not load
[ ] Can't hear anything in sound demo, missing wav file?
[ ] In the trigger demo the pov character just falls through the world and you can see a clone left behind
[ ] In VR the b3d (main) demo often leaves a frozen clone behind when you start walking
[ ] Planet material seems pinched at one pole
[ ] Possible leaks in jolt plugin
