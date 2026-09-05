// Core
export { B3d, b3d, showB3dStats } from './tosi-b3d.js';
/*
Re-export the Babylon namespace the library itself is using.

Babylon is a peer dependency, so a consumer importing '@babylonjs/core'
separately can end up with a SECOND copy — two Vector3 classes that fail
`instanceof` against each other. Taking it from here is the guarantee that you
have the same one. It is also what live doc examples should import: there is no
`BABYLON` global (a long-standing assumption in ~16 of them, and one line away
from a ReferenceError in every case).
*/
export * as BABYLON from '@babylonjs/core';
// Device-capability probe (measure-don't-guess quality budgets)
export { B3dProbe, b3dProbe, runProbe } from './b3d-probe.js';
export { getPerfProfile, setPerfProfile, setQuality, getQuality, effectiveTier, qualityBudgets, resolveBudget, onQualityChange, } from './b3d-quality.js';
export { PROBE_VERSION, classify, budgetsForTier, resolveProfile, defaultProfile, isStandaloneHmd, tierCap, } from './perf-probe.js';
// World simulation (narrative-driver boundary)
export { WorldStore } from './world-store.js';
export { WorldView, defaultMeshFactory } from './world-view.js';
export { proximityRung, rungNominal, routePortals, containmentPath, } from './world-topology.js';
export { runMinSimConformance } from './min-sim-conformance.js';
// Utilities
export { findB3dOwner, B3dChild, AbstractMesh, buildAxes, isOff, actualMeshes, enterXR, applyMaterialConventions, publicName, isIgnored, placeOnSurface, boundingBottomOffset, sceneDelta, 
// Documented API that was reachable only by a deep import — which `exports`
// (a bare string) blocks with ERR_PACKAGE_PATH_NOT_EXPORTED. `isNoCollide`'s
// shipped JSDoc instructs consumers to call it, and CLAUDE.md tells them to
// use `semanticParent`; instructing someone to call something they cannot
// import is worse than not documenting it.
markUiMesh, isNoCollide, collidable, cameraIsAttached, semanticParent, conventionName, simHalted, controlsLive, } from './b3d-utils.js';
// The pure flight model, so a consumer can predict what the aircraft will do
// without instantiating one — `equilibriumSpeed` is what the HUD's set-point
// mark is drawn from, and a mission planner wants the same number.
export { regime, flyByWireStep, targetVelocity, chaseVelocity, equilibriumSpeed, } from './fly-by-wire.js';
/*
The MEDIUM primitive as a namespace, not bare names: `plane`, `sphere` and
`crossing` are common nouns and would collide the moment anything else wants
them (`carve` already has a sphere). Types stay top-level.
*/
import * as mediumNs from './medium.js';
export const medium = mediumNs;
/*
See-through portal math, namespaced: `sideOf` and `crossedPortal` are generic
enough to collide, and `portalCamera` reads better qualified.
*/
import * as portalNs from './portal-transform.js';
export const portalTransform = portalNs;
// Logical asset URLs (retarget the host in one place; see asset-url.ts)
export { setAssetBase, getAssetBase, assetUrl } from './asset-url.js';
// Pure spatial-attachment transform math (see SPATIAL-DESIGN.md)
export { add, sub, quatConjugate, quatMul, rotateVector, quatFromAxisAngle, composePose, relativePose, placeRelative, IDENTITY_QUAT, } from './spatial-transform.js';
// Pure aircraft-HUD math (radar-trace projection + horizon + glass projection)
export { hudTrace, horizonTransform, glassUV, hudPointFromUV, lockFillOpacity, arcDashArray, } from './hud-math.js';
// HUD driver (meters / horizon / radar traces over the HUD SVG)
export { createHudController, loadHud, buildFallbackHud } from './hud.js';
export { B3dHud, b3dHud } from './b3d-hud.js';
// Scene components
export { B3dLoader, b3dLoader } from './b3d-loader.js';
export { B3dLibrary, b3dLibrary } from './b3d-library.js';
export { B3dSun, b3dSun } from './b3d-shadows.js';
export { B3dReflections, b3dReflections } from './b3d-reflections.js';
export { B3dSkybox, b3dSkybox } from './b3d-skybox.js';
export { B3dWater, b3dWater } from './b3d-water.js';
export { B3dLight, b3dLight } from './b3d-light.js';
export { B3dLamp, B3dPointLight, b3dPointLight, B3dSpotLight, b3dSpotLight, B3dAreaLight, b3dAreaLight, } from './b3d-lamp.js';
// A lamp's whole life as ONE curve per channel, split into attack / sustain /
// decay by two markers — the model behind its flicker, pulse and fade.
export { segmentTimes, lightPreset, lightPresets, DEFAULT_PROGRAM, lightProgramSchema, canonicalProgram, validateProgram, sampleLight, programPosition, lightPhase, isAnimated, shiftHue, NO_MODULATION, } from './light-modulation.js';
/*
A province's climate layer as DATA — bipolar bias curves plus the two water
scalars. Pure (no DOM, no Babylon) so a consumer can validate and serialise one
headlessly; see PROVINCE-DESIGN.md -> "TWO editors".
*/
export { sampleClimate, composeClimate, applyClimate, provinceClimateSchema, canonicalClimate, validateClimate, DEFAULT_AMOUNTS, NO_CLIMATE, } from './province-climate.js';
/*
JSON Schema for the scene primitives — no DOM, no Babylon, so a consumer's
headless runner can read them. Exists so nobody hand-copies our attributes:
ensemble's hand-written skybox schema carried 6 of 16 and disagreed on a
default (#63). Drift is caught by a test, not promised.
*/
export { skyboxSchema, sunSchema, waterSchema, fogSchema, cloudsSchema, ambientSchema, hemisphericLightSchema, sceneSchemas, SCENE_OMITTED, } from './scene-schemas.js';
export { B3dFog, b3dFog } from './b3d-fog.js';
export { B3dClouds, b3dClouds } from './b3d-clouds.js';
export { softShadowTexture, shadowDecalMaterial, createShadowDecal, projectShadowDown, } from './shadow-decal.js';
// Projected cloud shadows: one top-down texture sampled by world position (works over terrain).
export { CloudShadowMap, projectShadowXZ, shadowWindowUv, } from './cloud-shadows.js';
export { B3dAmbient, b3dAmbient } from './b3d-ambient.js';
export { LeafField } from './ambient-leaves.js';
// Garnish competes for ONE pool and switches OFF rather than thinning into a lie.
export { allocateAmbient, fillWeight, ratchetPool } from './ambient-budget.js';
// Atmosphere: fog is ALWAYS ON and systems lean on it (underwater / cloud / space).
export { compositeFog, approachFog, band } from './atmosphere.js';
export { B3dSphere, b3dSphere, B3dBox, b3dBox, B3dGround, b3dGround, } from './b3d-primitives.js';
export { B3dButton, b3dButton } from './b3d-button.js';
export { B3dCollisions, b3dCollisions } from './b3d-collisions.js';
export { B3dPhysics, b3dPhysics } from './b3d-physics.js';
export { JoltPlugin } from './jolt-plugin.js';
export { emptyInput, CompositeInputProvider } from './control-input.js';
export { XRInputProvider } from './xr-input-provider.js';
export { B3dControllable } from './b3d-controllable.js';
export { B3dController, b3dController } from './b3d-controller.js';
export { emptyGamepad, mergeGamepads, bipedMapping, bipedMappingDescriptor, carMapping, carMappingDescriptor, aircraftMapping, aircraftMappingDescriptor, MappedInputProvider, } from './virtual-gamepad.js';
export { STICK_UP_IS_POSITIVE } from './virtual-gamepad.js';
export { KeyboardGamepadSource, keyboardGamepad } from './keyboard-gamepad.js';
export { HardwareGamepadSource } from './hardware-gamepad.js';
export { TouchGamepadSource } from './touch-gamepad.js';
export { gamepadSvg } from './gamepad-svg.js';
export { B3dGamepad, b3dGamepad, parseGamepadControls, } from './glass-gamepad.js';
export { XrGamepadSource } from './xr-gamepad.js';
// XR reference frames & spatial UI
export { XrFrames, EntityFrame, angleDelta, dampYaw, facingYaw, gazeReveal, } from './xr-frames.js';
export { attachFramePanel, placeholderPanelSvg, excludeFromGlow, } from './frame-panel.js';
export { B3dPanel, b3dPanel } from './b3d-panel.js';
// Character & input
export { B3dBiped, b3dBiped, AnimState } from './b3d-biped.js';
// Clip-name map for Quaternius UAL rigs — see b3d-biped.
export { ualAnimationStates } from './b3d-biped.js';
export { GameController, gameController } from './game-controller.js';
export { B3dInputFocus, inputFocus } from './b3d-input-focus.js';
export { gamepadState, gamepadText, xrControllers, xrControllersText, } from './gamepad.js';
// Vehicles
export { B3dCar, b3dCar } from './b3d-car.js';
export { B3dAircraft, b3dAircraft } from './b3d-aircraft.js';
// The callback-naming shim. `handleX` is the name across this library; `onX`
// still works and warns once. Exported so an adopter's own widgets can follow
// the same rule rather than re-implementing it.
export { handlerOf, resetHandlerWarnings } from './handler-of.js';
// Colour — the pure model (headless-safe) and the picker over it.
export { parseColor, formatColor, rgbToHsv, hsvToRgb, wrapHue, luminance, contrastInk, } from './color.js';
export { color3d } from './color-field.js';
// SVG widgets (DOM-overlay or in-scene panels)
export { panel3d, fitPanel, row3d, label3d, text3d, textBlock3d, button3d, iconBar3d, toggle3d, slider3d, select3d, list3d, menu3d, openMenu3d, spinner3d, progress3d, } from './widgets3d.js';
// Curve editing — the pure model, and the `curve3d` widget over it. A province
// is a footprint plus one curve per layer (PROVINCE-DESIGN.md).
export { normalizeCurve, evaluateCurve, blendSample, flipCurve, movePoint, insertPoint, deletePoint, pointAt, curvePresets, presetsFor, defaultCurve, polygonExtent, polygonVertices, closePolygon, moveVertex, isStarShaped, MIN_EXTENT, 
// The PARAMETERISED builders, so a consumer is not stuck with the preset's
// frozen arguments — `plateauFalloff(0.8)` and `messyNgon(24, 0.3, 7)` are
// the point of them having parameters at all.
//
// `linear`/`constant`/`stepped`/`circle`/`rim`/`easeIn`… stay OUT: bare common
// nouns, and `circle` would shadow svgElements' `circle`. That is the barrel
// rule in CLAUDE.md, and they are reachable via `defaultCurve(kind)` and
// `presetsFor(kind)`.
ngon, messyNgon, shelfAndMountains, desertTerraces, plateauFalloff, smoothEdge, abruptEdge, } from './curve.js';
export { moveMarker, normalizeMarkers, MIN_SPLIT_GAP } from './curve.js';
// Serialisation contract with tosijs-3d-ensemble (#61): plain JSON, canonical
// bytes, a validator that never throws, and a schema fragment to dispatch on.
export { readCurve, canonicalCurve, validateCurve, curveSchema, CURVE_PRECISION, } from './curve.js';
export { curve3d, curveMarkers } from './curve-field.js';
// The composite: several curves sharing ONE pair of split markers, so the
// invariant lives where it can be enforced (see #61 Q5a).
export { curveProgram3d, PROGRAM_CHANNELS } from './curve-program.js';
// The whole lamp — static properties plus the program, as one field.
export { lightEditor3d } from './light-editor.js';
/*
A lamp as DATA, from a module with no DOM and no Babylon — so a consumer can
validate, canonicalise and schema-describe one in a headless runner without
instantiating a UI. (Importing the EDITOR pulls in tosijs and needs
HTMLElement; ensemble's test suite has no browser.)
*/
export { lightColor, lightSettingsSchema, canonicalLight, validateLight, DEFAULT_LIGHT, } from './light-settings.js';
export { iconGrid3d } from './icon-grid.js';
export { footprint3d } from './footprint-field.js';
// A coordinate on ONE row — the density win for inspector panels. Its own
// module so it tree-shakes, and top-level like the other `*3d` widgets.
export { vector3d, euler3d, wrapDegrees } from './vector-field.js';
export { panelFitWidth, panelFit, panelHeight, rowColumns, alignOffset, stackLayout, clampScroll, wrapText, wrapByMeasure, cssFont, textMeasurer, measureTextWrap, measureTextWidth, valueToFraction, fractionToValue, } from './widgets3d-layout.js';
// SVG material system
export { SvgTexture } from './svg-texture.js';
export { B3dSvgPlane, b3dSvgPlane, panelScene } from './b3d-svg-plane.js';
export { panelGesture, uvToViewBox, planeLocalToViewBox, } from './b3d-svg-plane.js';
// Icon proxy (svgIcons.name() → SVG ElementCreator) over the generated icon set
export { svgIcons, createSvgIcons, iconGlyph, iconNames, iconAliases, iconData, 
// Consumers own icons too: `registerIcons` adds names every WIDGET can
// resolve, which a private `createSvgIcons` set cannot do.
registerIcons, iconExists, isRegisteredIcon, } from './svg-icons.js';
export { parseStyleSuffixes, mergeIconStyle, } from './icon-name.js';
// ---------------------------------------------------------------------------
// The SVG UI surface, namespaced as `ui.*` — `ui.box`, `ui.table`, `ui.keyboard`.
// These are COMMON NOUNS (box, table, button, edit, insert…); exporting them
// bare from a library barrel collides with every consumer's own vocabulary, so
// the family lives in one container and the top level stays clean. Types stay
// top-level (PascalCase — no pollution, and types can't live on a const).
// Decided at the 0.6.0 rc gate — see UI-DESIGN-NOTES.
// ---------------------------------------------------------------------------
import { flowLayout, nearestInDirection, placePopup } from './flow-layout.js';
import { box, textBlock, inlineIcon, blockItem, inlineItem, button, svgPoint, } from './box.js';
import { surface, openMenu } from './surface.js';
import { widgetBox, widgetChild } from './widget-box.js';
import { edit, insert, backspace, deleteForward, moveCaret, moveTo, selectAll, selectedText, selectionRange, hasSelection, length as editLength, } from './text-edit.js';
import { selectionIcon, applySelection } from './selection.js';
import { resolveColumns, visibleRows, contentHeight as tableContentHeight, maxScroll as tableMaxScroll, rowAt, columnAt, } from './table-layout.js';
import { gamepadFocus, createFocusPulse } from './gamepad-focus.js';
import { keyboard, inputField, fieldGroup, autoKeyboardEnabled, setAutoKeyboard, } from './keyboard.js';
import { keyLayout, accentsFor, hasAccents, keyRects, keyboardHeight, keyAt, } from './key-layout.js';
import { table } from './table.js';
export const ui = {
    // flow-layout core (pure)
    flowLayout,
    nearestInDirection,
    placePopup,
    // box — the flow container (paint / resize / scroll)
    box,
    textBlock,
    inlineIcon,
    blockItem,
    inlineItem,
    button,
    svgPoint,
    // surface — content + overlay popups; cascade menus + persistent panels
    surface,
    openMenu,
    // widgets3d controls inside a box/surface
    widgetBox,
    widgetChild,
    // data table + its pure geometry
    table,
    resolveColumns,
    visibleRows,
    tableContentHeight,
    tableMaxScroll,
    rowAt,
    columnAt,
    // on-screen keyboard + input field, and the pure keyboard model
    keyboard,
    inputField,
    fieldGroup,
    // The SHARED on-screen-keyboard preference the field glyph toggles — exported
    // so an app can seed it, persist it, or drive it from its own settings.
    autoKeyboardEnabled,
    setAutoKeyboard,
    keyLayout,
    accentsFor,
    hasAccents,
    keyRects,
    keyboardHeight,
    keyAt,
    // pure text-editing model (code-point aware)
    edit,
    insert,
    backspace,
    deleteForward,
    moveCaret,
    moveTo,
    selectAll,
    selectedText,
    selectionRange,
    hasSelection,
    editLength,
    // selection-as-icon
    selectionIcon,
    applySelection,
    // gamepad D-pad → focus traversal
    gamepadFocus,
    createFocusPulse,
};
// Procedural biome shader (TERRAIN-SHADER-DESIGN.md): pure chart model + plugin
export { mantaAxes, planetaryAxes, chartUV, cellBlend, slopeMask, photicFactor, } from './biome-chart.js';
// Slope profiles — levels adjustments for terrain, localizable across regions
export { cliffProfile, beachProfile, rollingProfile, mesaProfile, terraceProfile, blendProfiles, profileField, } from './slope-profile.js';
export { volcano, impactCrater, pad, gulley, cover, composeLandforms, mergeProvinces, } from './landform.js';
// Volumetric patch substrate (tunnels/caverns — see TODO 0.7.0)
export { latticeHash, latticePoint, extractChunk } from './sdf-lattice.js';
/*
The CARVE family lives in a container for the same reason the `ui` family does
(see the note above): `box`, `sphere`, `tube`, `union` are COMMON NOUNS, and a
library barrel that exports them bare collides with every consumer's own
vocabulary. `box` was the sharp end — a second one here would have shadowed
`ui.box`, which is exactly the collision the 0.6.0 rc gate namespaced `ui` to
prevent. Caught by the 0.7.0 gate while the window was still free.
*/
import { applyCarve, sphere, capsule, tube, box as carveBox, union, smoothUnion, flange, subtract, intersect, roughen, warp, shaft, } from './carve.js';
export const carve = {
    applyCarve,
    sphere,
    capsule,
    tube,
    box: carveBox,
    union,
    smoothUnion,
    flange,
    subtract,
    intersect,
    roughen,
    warp,
    shaft,
};
export { terrainDensity, composePatches, circleFootprint, marginBlend, } from './patch-field.js';
export { BiomePlugin, attachBiomePlugin, defaultBiomeParams, MANTA_PALETTE, LAVA_PALETTE, CRYOVOLCANIC_PALETTE, } from './biome-plugin.js';
// Effects & interaction
export { B3dParticles, b3dParticles } from './b3d-particles.js';
export { B3dSound, b3dSound } from './b3d-sound.js';
export { B3dTrigger, b3dTrigger } from './b3d-trigger.js';
// Interactive: the substrate for touching a thing — doors, knobs, switches, locks.
export { B3dInteractive, b3dInteractive } from './b3d-interactive.js';
export { InteractiveBehavior, nearestInteractive, useNearest, } from './interactive-behavior.js';
export { interactStep, newInteractState, activationVeto, withinReach, } from './interaction.js';
// Death: the exit a crash needs (wreckage, orbit camera, respawn panel)
export { B3dDeath, b3dDeath } from './b3d-death.js';
// Wreck fall: the pure tumbling-descent model b3d-death drops a corpse with.
export { newWreckFall, wreckFallStep, tumbleAxis } from './wreck-fall.js';
// Buoyancy: the pure vertical model behind the biped's swimming.
export { buoyantStep, submergedFraction, equilibriumSubmersion, isSwimming, } from './buoyancy.js';
// Swim aim: the pure model behind look-directed swimming.
export { clampAim, aimFromLook, integrateAim, easeAim, aimTarget, } from './swim-aim.js';
// Spawner: keeps the world populated with encounters (prefab + a rule).
export { B3dSpawner, b3dSpawner } from './b3d-spawner.js';
// Formations: pure placement patterns for an encounter's members.
export { ring, vee, escorts, line, at } from './formations.js';
// Prefabs: a named factory that instantiates a package of stuff at a pose (remains, loot,
// spawner payloads, pickups). See prefab.ts.
export { definePrefab, getPrefab, prefabNames, spawnPrefab } from './prefab.js';
export { explodeMesh } from './b3d-exploder.js';
// Procedural
export { PerlinNoise } from './perlin-noise.js';
export { MersenneTwister, PRNG } from './mersenne-twister.js';
export { B3dTerrain, b3dTerrain } from './b3d-terrain.js';
export { B3dPlanet, b3dPlanet } from './b3d-planet.js';
export { B3dStar, b3dStar } from './b3d-star.js';
export { B3dBlackHole, b3dBlackHole } from './b3d-black-hole.js';
export { B3dGalaxy, b3dGalaxy } from './b3d-galaxy.js';
export { B3dStarSystem, b3dStarSystem } from './b3d-star-system.js';
export { generateGalaxy, generateStarSystem, starTypeData, randomName, capitalize, romanNumeral, } from './galaxy-data.js';
export { PiecewiseLinearFilter, identityFilter, plateauFilter, } from './gradient-filter.js';
export { GradientEditor, gradientEditor } from './gradient-editor.js';
export { TorusSampler, SphereSampler, CylinderSampler, } from './surface-sampler.js';
// Combat — pure, deterministic models (see COMBAT-DESIGN.md)
export { makeResource, drain, refill, regenTick, isEmpty, isFull, fraction, } from './resource.js';
export { CombatWorld, DEFAULT_CHAIN_DELAY } from './destroyable.js';
export { B3dDestroyable, b3dDestroyable } from './b3d-destroyable.js';
export { DestroyableBehavior } from './destroyable-behavior.js';
export { B3dWarhead, b3dWarhead, detonateWarhead, explosionFx, } from './b3d-warhead.js';
export { B3dLauncher, b3dLauncher, spawnProjectile, spawnMissile, } from './b3d-launcher.js';
export { createMakers } from './make-mesh.js';
export { roundedRectGeometry, signedArea } from './rounded-rect.js';
export { openPopup } from './popup-surface.js';
export { B3dTurret, b3dTurret } from './b3d-turret.js';
export { B3dRadarBlip, b3dRadarBlip } from './b3d-radar-blip.js';
export { B3dRadar, b3dRadar } from './b3d-radar.js';
export { Radar, coneDotFromDegrees, isOpposed } from './radar.js';
export { steerToward, proNav, interceptLead, boostAuthority, gAdd, gSub, gScale, gDot, gCross, gLen, gNormalize, } from './guidance.js';
export { canonicalize, normalizeScale, findCenterOfGravity, applyCenterOfGravity, } from './model-transform.js';
export { aoeFalloff, resolveAoe, dist3 } from './warhead.js';
export { ballisticStep, predictPath, ballisticAim } from './ballistics.js';
export { modeForType, isValidForType, commitValueForType, } from './key-layout.js';
export { w3dTheme, setW3dTheme, withTheme } from './w3d-theme.js';
export { waterNormalTexture, tileHeight, writeNormalMap, } from './water-normal.js';
export { themeEditor, FONT_STACKS } from './theme-editor.js';
export { registerSvgFont, unregisterSvgFont, fontFaceCss, svgFontStyle, base64OfBytes, } from './embed-font.js';
//# sourceMappingURL=index.js.map