// Core
export { B3d, b3d, showB3dStats } from './tosi-b3d';
// Device-capability probe (measure-don't-guess quality budgets)
export { B3dProbe, b3dProbe, runProbe } from './b3d-probe';
export { getPerfProfile, setPerfProfile, setQuality, getQuality, effectiveTier, qualityBudgets, resolveBudget, onQualityChange, } from './b3d-quality';
export { PROBE_VERSION, classify, budgetsForTier, resolveProfile, defaultProfile, isStandaloneHmd, tierCap, } from './perf-probe';
// World simulation (narrative-driver boundary)
export { WorldStore } from './world-store';
export { WorldView, defaultMeshFactory } from './world-view';
export { proximityRung, rungNominal, routePortals, containmentPath, } from './world-topology';
export { runMinSimConformance } from './min-sim-conformance';
// Utilities
export { findB3dOwner, B3dChild, AbstractMesh, buildAxes, isOff, actualMeshes, enterXR, applyMaterialConventions, placeOnSurface, boundingBottomOffset, } from './b3d-utils';
// Logical asset URLs (retarget the host in one place; see asset-url.ts)
export { setAssetBase, getAssetBase, assetUrl } from './asset-url';
// Pure spatial-attachment transform math (see SPATIAL-DESIGN.md)
export { add, sub, quatConjugate, quatMul, rotateVector, quatFromAxisAngle, composePose, relativePose, placeRelative, IDENTITY_QUAT, } from './spatial-transform';
// Pure aircraft-HUD math (radar-trace projection + horizon + glass projection)
export { hudTrace, horizonTransform, glassUV, hudPointFromUV, lockFillOpacity, } from './hud-math';
// HUD driver (meters / horizon / radar traces over the HUD SVG)
export { createHudController, loadHud, buildFallbackHud } from './hud';
export { B3dHud, b3dHud } from './b3d-hud';
// Scene components
export { B3dLoader, b3dLoader } from './b3d-loader';
export { B3dLibrary, b3dLibrary } from './b3d-library';
export { B3dSun, b3dSun } from './b3d-shadows';
export { B3dReflections, b3dReflections } from './b3d-reflections';
export { B3dSkybox, b3dSkybox } from './b3d-skybox';
export { B3dWater, b3dWater } from './b3d-water';
export { B3dLight, b3dLight } from './b3d-light';
export { B3dFog, b3dFog } from './b3d-fog';
export { B3dClouds, b3dClouds } from './b3d-clouds';
export { softShadowTexture, shadowDecalMaterial, createShadowDecal, projectShadowDown, } from './shadow-decal';
// Projected cloud shadows: one top-down texture sampled by world position (works over terrain).
export { CloudShadowMap, projectShadowXZ, shadowWindowUv, } from './cloud-shadows';
export { B3dAmbient, b3dAmbient } from './b3d-ambient';
export { LeafField } from './ambient-leaves';
// Garnish competes for ONE pool and switches OFF rather than thinning into a lie.
export { allocateAmbient, fillWeight, ratchetPool } from './ambient-budget';
// Atmosphere: fog is ALWAYS ON and systems lean on it (underwater / cloud / space).
export { compositeFog, approachFog, band } from './atmosphere';
export { B3dSphere, b3dSphere, B3dBox, b3dBox, B3dGround, b3dGround, } from './b3d-primitives';
export { B3dButton, b3dButton } from './b3d-button';
export { B3dCollisions, b3dCollisions } from './b3d-collisions';
export { B3dPhysics, b3dPhysics } from './b3d-physics';
export { JoltPlugin } from './jolt-plugin';
export { emptyInput, CompositeInputProvider } from './control-input';
export { XRInputProvider } from './xr-input-provider';
export { B3dControllable } from './b3d-controllable';
export { B3dController, b3dController } from './b3d-controller';
export { emptyGamepad, mergeGamepads, bipedMapping, bipedMappingDescriptor, carMapping, carMappingDescriptor, aircraftMapping, aircraftMappingDescriptor, MappedInputProvider, } from './virtual-gamepad';
export { KeyboardGamepadSource, keyboardGamepad } from './keyboard-gamepad';
export { HardwareGamepadSource } from './hardware-gamepad';
export { TouchGamepadSource } from './touch-gamepad';
export { gamepadSvg } from './gamepad-svg';
export { B3dGamepad, b3dGamepad, parseGamepadControls } from './glass-gamepad';
export { XrGamepadSource } from './xr-gamepad';
// XR reference frames & spatial UI
export { XrFrames, EntityFrame, angleDelta, dampYaw, facingYaw, gazeReveal, } from './xr-frames';
export { attachFramePanel, placeholderPanelSvg, excludeFromGlow, } from './frame-panel';
export { B3dPanel, b3dPanel } from './b3d-panel';
// Character & input
export { B3dBiped, b3dBiped, AnimState } from './b3d-biped';
export { GameController, gameController } from './game-controller';
export { B3dInputFocus, inputFocus } from './b3d-input-focus';
export { gamepadState, gamepadText, xrControllers, xrControllersText, } from './gamepad';
// Vehicles
export { B3dCar, b3dCar } from './b3d-car';
export { B3dAircraft, b3dAircraft } from './b3d-aircraft';
// SVG widgets (DOM-overlay or in-scene panels)
export { panel3d, label3d, text3d, textBlock3d, button3d, iconBar3d, toggle3d, slider3d, select3d, list3d, } from './widgets3d';
export { stackLayout, clampScroll, wrapText, wrapByMeasure, cssFont, textMeasurer, measureTextWrap, measureTextWidth, valueToFraction, fractionToValue, } from './widgets3d-layout';
// SVG material system
export { SvgTexture } from './svg-texture';
export { B3dSvgPlane, b3dSvgPlane } from './b3d-svg-plane';
// Icon proxy (svgIcons.name() → SVG ElementCreator) over the generated icon set
export { svgIcons, createSvgIcons, iconGlyph, iconNames, iconAliases, iconData, } from './svg-icons';
export { parseStyleSuffixes, mergeIconStyle, } from './icon-name';
// Pure flow-layout core (block/inline-block) — substrate for the SVG UI surface
export { flowLayout, nearestInDirection, placePopup, } from './flow-layout';
// Flow `box` — the SVG UI container (paint / resize / scroll) built on flowLayout
export { box, textBlock, inlineIcon, blockItem, inlineItem, button, } from './box';
// UI surface — content + overlay popups; cascade menus
export { surface, openMenu, } from './surface';
// Bridge: widgets3d controls (slider/toggle/select/list) inside a box/surface
export { widgetBox, widgetChild } from './widget-box';
// Pure text-editing model (code-point aware) for the SVG input field
export { edit, insert, backspace, deleteForward, moveCaret, moveTo, selectAll, selectedText, selectionRange, hasSelection, length as editLength, } from './text-edit';
// On-screen keyboard + text field (Widget3d — drops into a widgetBox/surface panel)
export { keyboard, inputField } from './keyboard';
// Pure virtual-keyboard model: layouts, long-press accents, key geometry
export { keyLayout, accentsFor, hasAccents, keyRects, keyboardHeight, keyAt, } from './key-layout';
// Effects & interaction
export { B3dParticles, b3dParticles } from './b3d-particles';
export { B3dSound, b3dSound } from './b3d-sound';
export { B3dTrigger, b3dTrigger } from './b3d-trigger';
// Death: the exit a crash needs (wreckage, orbit camera, respawn panel)
export { B3dDeath, b3dDeath } from './b3d-death';
// Spawner: keeps the world populated with encounters (prefab + a rule).
export { B3dSpawner, b3dSpawner } from './b3d-spawner';
// Formations: pure placement patterns for an encounter's members.
export { ring, vee, escorts, line, at } from './formations';
// Prefabs: a named factory that instantiates a package of stuff at a pose (remains, loot,
// spawner payloads, pickups). See prefab.ts.
export { definePrefab, getPrefab, prefabNames, spawnPrefab } from './prefab';
export { explodeMesh } from './b3d-exploder';
// Procedural
export { PerlinNoise } from './perlin-noise';
export { MersenneTwister, PRNG } from './mersenne-twister';
export { B3dTerrain, b3dTerrain } from './b3d-terrain';
export { B3dPlanet, b3dPlanet } from './b3d-planet';
export { B3dStar, b3dStar } from './b3d-star';
export { B3dBlackHole, b3dBlackHole } from './b3d-black-hole';
export { B3dGalaxy, b3dGalaxy } from './b3d-galaxy';
export { B3dStarSystem, b3dStarSystem } from './b3d-star-system';
export { generateGalaxy, generateStarSystem, starTypeData, randomName, capitalize, romanNumeral, } from './galaxy-data';
export { PiecewiseLinearFilter, identityFilter, plateauFilter, } from './gradient-filter';
export { GradientEditor, gradientEditor } from './gradient-editor';
export { TorusSampler, SphereSampler, CylinderSampler } from './surface-sampler';
// Combat — pure, deterministic models (see COMBAT-DESIGN.md)
export { makeResource, drain, refill, regenTick, isEmpty, isFull, fraction, } from './resource';
export { CombatWorld, DEFAULT_CHAIN_DELAY } from './destroyable';
export { B3dDestroyable, b3dDestroyable } from './b3d-destroyable';
export { DestroyableBehavior } from './destroyable-behavior';
export { B3dWarhead, b3dWarhead, detonateWarhead, explosionFx, } from './b3d-warhead';
export { B3dLauncher, b3dLauncher, spawnProjectile, spawnMissile, } from './b3d-launcher';
export { B3dTurret, b3dTurret } from './b3d-turret';
export { B3dRadarBlip, b3dRadarBlip } from './b3d-radar-blip';
export { B3dRadar, b3dRadar } from './b3d-radar';
export { Radar, coneDotFromDegrees, isOpposed } from './radar';
export { steerToward, proNav, interceptLead, boostAuthority, gAdd, gSub, gScale, gDot, gCross, gLen, gNormalize, } from './guidance';
export { aoeFalloff, resolveAoe, dist3 } from './warhead';
export { ballisticStep, predictPath, ballisticAim } from './ballistics';
//# sourceMappingURL=index.js.map