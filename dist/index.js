// Core
export { B3d, b3d, showB3dStats } from './tosi-b3d';
// Device-capability probe (measure-don't-guess quality budgets)
export { B3dProbe, b3dProbe, runProbe } from './b3d-probe';
export { getPerfProfile, setPerfProfile, setQuality, getQuality, effectiveTier, qualityBudgets, resolveBudget, onQualityChange, } from './b3d-quality';
export { PROBE_VERSION, classify, budgetsForTier, resolveProfile, defaultProfile, isStandaloneHmd, tierCap, } from './perf-probe';
// World simulation (narrative-driver boundary)
export { WorldStore } from './world-store';
export { WorldView, defaultMeshFactory } from './world-view';
// Utilities
export { findB3dOwner, B3dChild, AbstractMesh, buildAxes, isOff, actualMeshes, enterXR, applyMaterialConventions, placeOnSurface, boundingBottomOffset, } from './b3d-utils';
// Logical asset URLs (retarget the host in one place; see asset-url.ts)
export { setAssetBase, getAssetBase, assetUrl } from './asset-url';
// Pure spatial-attachment transform math (see SPATIAL-DESIGN.md)
export { add, sub, quatConjugate, quatMul, rotateVector, quatFromAxisAngle, composePose, relativePose, placeRelative, IDENTITY_QUAT, } from './spatial-transform';
// Pure aircraft-HUD math (radar-trace projection + horizon)
export { hudTrace, horizonTransform } from './hud-math';
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
export { attachFramePanel, placeholderPanelSvg } from './frame-panel';
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
export { panel3d, label3d, text3d, button3d, toggle3d, slider3d, select3d, list3d, } from './widgets3d';
export { stackLayout, clampScroll, wrapText, valueToFraction, fractionToValue, } from './widgets3d-layout';
// SVG material system
export { SvgTexture } from './svg-texture';
export { B3dSvgPlane, b3dSvgPlane } from './b3d-svg-plane';
// Effects & interaction
export { B3dParticles, b3dParticles } from './b3d-particles';
export { B3dSound, b3dSound } from './b3d-sound';
export { B3dTrigger, b3dTrigger } from './b3d-trigger';
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
export { B3dWarhead, b3dWarhead, detonateWarhead } from './b3d-warhead';
export { B3dLauncher, b3dLauncher, spawnProjectile, spawnMissile, } from './b3d-launcher';
export { B3dTurret, b3dTurret } from './b3d-turret';
export { B3dRadarBlip, b3dRadarBlip } from './b3d-radar-blip';
export { B3dRadar, b3dRadar } from './b3d-radar';
export { Radar, coneDotFromDegrees, isOpposed, } from './radar';
export { steerToward, proNav, interceptLead, gAdd, gSub, gScale, gDot, gCross, gLen, gNormalize, } from './guidance';
export { aoeFalloff, resolveAoe, dist3 } from './warhead';
export { ballisticStep, predictPath, ballisticAim } from './ballistics';
//# sourceMappingURL=index.js.map