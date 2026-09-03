// Core
export { B3d, b3d, showB3dStats } from './tosi-b3d'
/*
Re-export the Babylon namespace the library itself is using.

Babylon is a peer dependency, so a consumer importing '@babylonjs/core'
separately can end up with a SECOND copy — two Vector3 classes that fail
`instanceof` against each other. Taking it from here is the guarantee that you
have the same one. It is also what live doc examples should import: there is no
`BABYLON` global (a long-standing assumption in ~16 of them, and one line away
from a ReferenceError in every case).
*/
export * as BABYLON from '@babylonjs/core'
export type {
  SceneAdditions,
  SceneAdditionHandler,
  DebugPanelSource,
} from './tosi-b3d'

// Device-capability probe (measure-don't-guess quality budgets)
export { B3dProbe, b3dProbe, runProbe } from './b3d-probe'
export {
  getPerfProfile,
  setPerfProfile,
  setQuality,
  getQuality,
  effectiveTier,
  qualityBudgets,
  resolveBudget,
  onQualityChange,
} from './b3d-quality'
export type { QualitySetting, NumericBudgetKey } from './b3d-quality'
export {
  PROBE_VERSION,
  classify,
  budgetsForTier,
  resolveProfile,
  defaultProfile,
  isStandaloneHmd,
  tierCap,
} from './perf-probe'
export type {
  PerfTier,
  PerfMeasurements,
  PerfBudgets,
  PerfProfile,
  StoredProfile,
  ClassHints,
} from './perf-probe'

// World simulation (narrative-driver boundary)
export { WorldStore } from './world-store'
export { WorldView, defaultMeshFactory } from './world-view'
export type { MeshFactory } from './world-view'
export {
  proximityRung,
  rungNominal,
  routePortals,
  containmentPath,
} from './world-topology'
export { runMinSimConformance } from './min-sim-conformance'
export type { ConformanceHarness, TickableMinSim } from './min-sim-conformance'
export type {
  WorldState,
  WorldEntity,
  EntityComponents,
  HealthComponent,
  InventoryEntry,
  FactionComponent,
  InteractableComponent,
  EntityId,
  EntityKind,
  EntityIntent,
  Behavior,
  Zone,
  ZoneId,
  SpawnSpec,
  SimulationEvent,
  EventHandler,
  Unsubscribe,
  WorldApi,
  // Contract A — the coordinate-free surface (minimum-sim.md §8; additive, retires flat at B-SIM-1)
  PlaceId,
  PortalId,
  ChoiceId,
  Shape,
  Proximity,
  PlaceKind,
  Place,
  Portal,
  PlacedEntity,
  Anchor,
  SteerTarget,
  Choice,
  SchematicView,
  MinSimApi,
} from './world-contract'

// Utilities
export {
  findB3dOwner,
  B3dChild,
  AbstractMesh,
  buildAxes,
  isOff,
  actualMeshes,
  enterXR,
  applyMaterialConventions,
  publicName,
  isIgnored,
  placeOnSurface,
  boundingBottomOffset,
  sceneDelta,
  // Documented API that was reachable only by a deep import — which `exports`
  // (a bare string) blocks with ERR_PACKAGE_PATH_NOT_EXPORTED. `isNoCollide`'s
  // shipped JSDoc instructs consumers to call it, and CLAUDE.md tells them to
  // use `semanticParent`; instructing someone to call something they cannot
  // import is worse than not documenting it.
  markUiMesh,
  isNoCollide,
  collidable,
  cameraIsAttached,
  semanticParent,
  conventionName,
  simHalted,
  controlsLive,
} from './b3d-utils'
export type { XRStuff, XRParams, SimGateOwner } from './b3d-utils'

// The pure flight model, so a consumer can predict what the aircraft will do
// without instantiating one — `equilibriumSpeed` is what the HUD's set-point
// mark is drawn from, and a mission planner wants the same number.
export {
  regime,
  flyByWireStep,
  targetVelocity,
  chaseVelocity,
  equilibriumSpeed,
} from './fly-by-wire'
export type {
  FlyByWireConfig,
  FlyByWireCommand,
  FlyByWireState,
} from './fly-by-wire'

/*
The MEDIUM primitive as a namespace, not bare names: `plane`, `sphere` and
`crossing` are common nouns and would collide the moment anything else wants
them (`carve` already has a sphere). Types stay top-level.
*/
import * as mediumNs from './medium'
export const medium = mediumNs
export type {
  Medium,
  PlaneMedium,
  SphereMedium,
  MediumVec3,
  MediumCrossing,
} from './medium'

/*
See-through portal math, namespaced: `sideOf` and `crossedPortal` are generic
enough to collide, and `portalCamera` reads better qualified.
*/
import * as portalNs from './portal-transform'
export const portalTransform = portalNs

// Logical asset URLs (retarget the host in one place; see asset-url.ts)
export { setAssetBase, getAssetBase, assetUrl } from './asset-url'

// Pure spatial-attachment transform math (see SPATIAL-DESIGN.md)
export {
  add,
  sub,
  quatConjugate,
  quatMul,
  rotateVector,
  quatFromAxisAngle,
  composePose,
  relativePose,
  placeRelative,
  IDENTITY_QUAT,
} from './spatial-transform'
// Vec3 is already exported (surface-sampler) and is structurally identical.
export type { Quat, Pose } from './spatial-transform'

// Pure aircraft-HUD math (radar-trace projection + horizon + glass projection)
export {
  hudTrace,
  horizonTransform,
  glassUV,
  hudPointFromUV,
  lockFillOpacity,
  arcDashArray,
} from './hud-math'
export type { HudTrace, HudTraceOptions, HorizonTransform } from './hud-math'
// HUD driver (meters / horizon / radar traces over the HUD SVG)
export { createHudController, loadHud, buildFallbackHud } from './hud'
export type {
  HudController,
  HudControllerOptions,
  MeterName,
  TraceKind,
  HudTraceInput,
  Side,
  HudWarning,
} from './hud'
export { B3dHud, b3dHud } from './b3d-hud'

// Scene components
export { B3dLoader, b3dLoader } from './b3d-loader'
export { B3dLibrary, b3dLibrary } from './b3d-library'
export { B3dSun, b3dSun } from './b3d-shadows'
export { B3dReflections, b3dReflections } from './b3d-reflections'
export { B3dSkybox, b3dSkybox } from './b3d-skybox'
export { B3dWater, b3dWater } from './b3d-water'
export { B3dLight, b3dLight } from './b3d-light'
export {
  B3dLamp,
  B3dPointLight,
  b3dPointLight,
  B3dSpotLight,
  b3dSpotLight,
  B3dAreaLight,
  b3dAreaLight,
} from './b3d-lamp'
// A lamp's whole life as ONE curve per channel, split into attack / sustain /
// decay by two markers — the model behind its flicker, pulse and fade.
export {
  segmentTimes,
  lightPreset,
  lightPresets,
  DEFAULT_PROGRAM,
  lightProgramSchema,
  canonicalProgram,
  validateProgram,
  sampleLight,
  programPosition,
  lightPhase,
  isAnimated,
  shiftHue,
  NO_MODULATION,
} from './light-modulation'
export type {
  LightPreset,
  LightProgram,
  LightPhase,
  ChannelCurves,
  ModulationCurve,
  ModulationSample,
} from './light-modulation'
/*
A province's climate layer as DATA — bipolar bias curves plus the two water
scalars. Pure (no DOM, no Babylon) so a consumer can validate and serialise one
headlessly; see PROVINCE-DESIGN.md -> "TWO editors".
*/
export {
  sampleClimate,
  composeClimate,
  applyClimate,
  provinceClimateSchema,
  canonicalClimate,
  validateClimate,
  DEFAULT_AMOUNTS,
  NO_CLIMATE,
} from './province-climate'
export type {
  ProvinceClimate,
  ClimateSample,
  ClimateCurve,
  ClimateAmounts,
} from './province-climate'
/*
JSON Schema for the scene primitives — no DOM, no Babylon, so a consumer's
headless runner can read them. Exists so nobody hand-copies our attributes:
ensemble's hand-written skybox schema carried 6 of 16 and disagreed on a
default (#63). Drift is caught by a test, not promised.
*/
export {
  skyboxSchema,
  sunSchema,
  waterSchema,
  fogSchema,
  cloudsSchema,
  ambientSchema,
  hemisphericLightSchema,
  sceneSchemas,
  SCENE_OMITTED,
} from './scene-schemas'
export { B3dFog, b3dFog } from './b3d-fog'
export { B3dClouds, b3dClouds } from './b3d-clouds'
export {
  softShadowTexture,
  shadowDecalMaterial,
  createShadowDecal,
  projectShadowDown,
} from './shadow-decal'
export type { ShadowDecalOptions, ProjectDownOptions } from './shadow-decal'
// Projected cloud shadows: one top-down texture sampled by world position (works over terrain).
export {
  CloudShadowMap,
  projectShadowXZ,
  shadowWindowUv,
} from './cloud-shadows'
export type { CloudShadowBlob } from './cloud-shadows'
export { B3dAmbient, b3dAmbient } from './b3d-ambient'
export { LeafField } from './ambient-leaves'
export type { LeafFieldOptions } from './ambient-leaves'
// Garnish competes for ONE pool and switches OFF rather than thinning into a lie.
export { allocateAmbient, fillWeight, ratchetPool } from './ambient-budget'
export type {
  AmbientRequest,
  AmbientAllocation,
  AmbientEffect,
} from './ambient-budget'
// Atmosphere: fog is ALWAYS ON and systems lean on it (underwater / cloud / space).
export { compositeFog, approachFog, band } from './atmosphere'
export type { FogState, FogLayer } from './atmosphere'
export {
  B3dSphere,
  b3dSphere,
  B3dBox,
  b3dBox,
  B3dGround,
  b3dGround,
} from './b3d-primitives'
export { B3dButton, b3dButton } from './b3d-button'
export { B3dCollisions, b3dCollisions } from './b3d-collisions'
export { B3dPhysics, b3dPhysics } from './b3d-physics'
export { JoltPlugin } from './jolt-plugin'

// Input abstraction
export type { ControlInput, InputProvider } from './control-input'
export { emptyInput, CompositeInputProvider } from './control-input'
export { XRInputProvider } from './xr-input-provider'
export { B3dControllable } from './b3d-controllable'
export { B3dController, b3dController } from './b3d-controller'

// Virtual gamepad system
export type {
  VirtualGamepad,
  GamepadSource,
  InputMapping,
  MappingLabels,
  InputMappingDescriptor,
  ThrottleDetentConfig,
} from './virtual-gamepad'
export {
  emptyGamepad,
  mergeGamepads,
  bipedMapping,
  bipedMappingDescriptor,
  carMapping,
  carMappingDescriptor,
  aircraftMapping,
  aircraftMappingDescriptor,
  MappedInputProvider,
} from './virtual-gamepad'
export { STICK_UP_IS_POSITIVE } from './virtual-gamepad'
export { KeyboardGamepadSource, keyboardGamepad } from './keyboard-gamepad'
export { HardwareGamepadSource } from './hardware-gamepad'
export { TouchGamepadSource } from './touch-gamepad'
export type { TouchGamepadOptions, GamepadPointerKind } from './touch-gamepad'
export { gamepadSvg } from './gamepad-svg'
export type { GamepadSvgColors } from './gamepad-svg'
export { B3dGamepad, b3dGamepad, parseGamepadControls } from './glass-gamepad'
export { XrGamepadSource } from './xr-gamepad'
export type { ClusterConfig, ClusterAnchor } from './glass-gamepad'

// XR reference frames & spatial UI
export {
  XrFrames,
  EntityFrame,
  angleDelta,
  dampYaw,
  facingYaw,
  gazeReveal,
} from './xr-frames'
export type { FrameName, XrFramesOptions } from './xr-frames'
export {
  attachFramePanel,
  placeholderPanelSvg,
  excludeFromGlow,
} from './frame-panel'
export type { FramePanelSpec, AnchorSpec, AnchorPreset } from './frame-panel'
export { B3dPanel, b3dPanel } from './b3d-panel'

// Character & input
export { B3dBiped, b3dBiped, AnimState } from './b3d-biped'
// Clip-name map for Quaternius UAL rigs — see b3d-biped.
export { ualAnimationStates } from './b3d-biped'
export type { AnimStateSpec } from './b3d-biped'
export { GameController, gameController } from './game-controller'
export { B3dInputFocus, inputFocus } from './b3d-input-focus'
export {
  gamepadState,
  gamepadText,
  xrControllers,
  xrControllersText,
} from './gamepad'

// Vehicles
export { B3dCar, b3dCar } from './b3d-car'
export { B3dAircraft, b3dAircraft } from './b3d-aircraft'

// SVG widgets (DOM-overlay or in-scene panels)
export {
  panel3d,
  row3d,
  label3d,
  text3d,
  textBlock3d,
  button3d,
  iconBar3d,
  toggle3d,
  slider3d,
  select3d,
  list3d,
  menu3d,
  openMenu3d,
  spinner3d,
  progress3d,
} from './widgets3d'
// Curve editing — the pure model, and the `curve3d` widget over it. A province
// is a footprint plus one curve per layer (PROVINCE-DESIGN.md).
export {
  normalizeCurve,
  evaluateCurve,
  blendSample,
  flipCurve,
  movePoint,
  insertPoint,
  deletePoint,
  pointAt,
  curvePresets,
  presetsFor,
  defaultCurve,
  polygonExtent,
  polygonVertices,
  closePolygon,
  moveVertex,
  isStarShaped,
  MIN_EXTENT,
  // The PARAMETERISED builders, so a consumer is not stuck with the preset's
  // frozen arguments — `plateauFalloff(0.8)` and `messyNgon(24, 0.3, 7)` are
  // the point of them having parameters at all.
  //
  // `linear`/`constant`/`stepped`/`circle`/`rim`/`easeIn`… stay OUT: bare common
  // nouns, and `circle` would shadow svgElements' `circle`. That is the barrel
  // rule in CLAUDE.md, and they are reachable via `defaultCurve(kind)` and
  // `presetsFor(kind)`.
  ngon,
  messyNgon,
  shelfAndMountains,
  desertTerraces,
  plateauFalloff,
  smoothEdge,
  abruptEdge,
} from './curve'
export { moveMarker, normalizeMarkers, MIN_SPLIT_GAP } from './curve'
// Serialisation contract with tosijs-3d-ensemble (#61): plain JSON, canonical
// bytes, a validator that never throws, and a schema fragment to dispatch on.
export {
  readCurve,
  canonicalCurve,
  validateCurve,
  curveSchema,
  CURVE_PRECISION,
} from './curve'
export type { SerializedCurve, CurveIssue } from './curve'
export type { CurveKind, CurvePreset } from './curve'
export { curve3d, curveMarkers } from './curve-field'
// The composite: several curves sharing ONE pair of split markers, so the
// invariant lives where it can be enforced (see #61 Q5a).
export { curveProgram3d, PROGRAM_CHANNELS } from './curve-program'
// The whole lamp — static properties plus the program, as one field.
export { lightEditor3d } from './light-editor'
export type { LightEditor3dOptions, LightEditorField } from './light-editor'
/*
A lamp as DATA, from a module with no DOM and no Babylon — so a consumer can
validate, canonicalise and schema-describe one in a headless runner without
instantiating a UI. (Importing the EDITOR pulls in tosijs and needs
HTMLElement; ensemble's test suite has no browser.)
*/
export {
  lightColor,
  lightSettingsSchema,
  canonicalLight,
  validateLight,
  DEFAULT_LIGHT,
} from './light-settings'
export type { LightSettings, LightKind } from './light-settings'
export type {
  CurveProgram3dOptions,
  CurveProgramField,
  ProgramChannel,
} from './curve-program'
export { iconGrid3d } from './icon-grid'
export type {
  IconGrid,
  IconGrid3dOptions,
  IconGridItem,
  IconGridChange,
} from './icon-grid'
export { footprint3d } from './footprint-field'
export type { Footprint3dOptions, FootprintField } from './footprint-field'
export type { Curve3dOptions, CurveField, CurveMarkers } from './curve-field'

// A coordinate on ONE row — the density win for inspector panels. Its own
// module so it tree-shakes, and top-level like the other `*3d` widgets.
export { vector3d, euler3d, wrapDegrees } from './vector-field'
/*
`WidgetHost` is exported deliberately, not incidentally: it is the type a
custom widget must name to implement `setHost`, and without it a consumer
could receive a host but never declare the parameter (tosijs-3d#59).
*/
export type {
  Widget3d,
  WidgetHost,
  MenuAction,
  Dynamic,
  Spinner3d,
  Progress3d,
} from './widgets3d'
export {
  panelFitWidth,
  panelFit,
  panelHeight,
  rowColumns,
  alignOffset,
  stackLayout,
  clampScroll,
  wrapText,
  wrapByMeasure,
  cssFont,
  textMeasurer,
  measureTextWrap,
  measureTextWidth,
  valueToFraction,
  fractionToValue,
} from './widgets3d-layout'
export type {
  StackLayout,
  FontSpec,
  PanelFit,
  RowColumn,
} from './widgets3d-layout'

// SVG material system
export { SvgTexture } from './svg-texture'
export type { SvgTextureOptions } from './svg-texture'
export { B3dSvgPlane, b3dSvgPlane, panelScene } from './b3d-svg-plane'
export type {
  PanelSceneOptions,
  PanelGestureEvent,
  PanelGestureAction,
} from './b3d-svg-plane'
export { panelGesture, uvToViewBox, planeLocalToViewBox } from './b3d-svg-plane'

// Icon proxy (svgIcons.name() → SVG ElementCreator) over the generated icon set
export {
  svgIcons,
  createSvgIcons,
  iconGlyph,
  iconNames,
  iconAliases,
  iconData,
  // Consumers own icons too: `registerIcons` adds names every WIDGET can
  // resolve, which a private `createSvgIcons` set cannot do.
  registerIcons,
  iconExists,
  isRegisteredIcon,
  type SvgIconCreator,
} from './svg-icons'
export {
  parseStyleSuffixes,
  mergeIconStyle,
  type IconStyle,
  type ParsedIconName,
} from './icon-name'

// ---------------------------------------------------------------------------
// The SVG UI surface, namespaced as `ui.*` — `ui.box`, `ui.table`, `ui.keyboard`.
// These are COMMON NOUNS (box, table, button, edit, insert…); exporting them
// bare from a library barrel collides with every consumer's own vocabulary, so
// the family lives in one container and the top level stays clean. Types stay
// top-level (PascalCase — no pollution, and types can't live on a const).
// Decided at the 0.6.0 rc gate — see UI-DESIGN-NOTES.
// ---------------------------------------------------------------------------
import { flowLayout, nearestInDirection, placePopup } from './flow-layout'
import {
  box,
  textBlock,
  inlineIcon,
  blockItem,
  inlineItem,
  button,
  svgPoint,
} from './box'
import { surface, openMenu } from './surface'
import { widgetBox, widgetChild } from './widget-box'
import {
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
  length as editLength,
} from './text-edit'
import { selectionIcon, applySelection } from './selection'
import {
  resolveColumns,
  visibleRows,
  contentHeight as tableContentHeight,
  maxScroll as tableMaxScroll,
  rowAt,
  columnAt,
} from './table-layout'
import { gamepadFocus, createFocusPulse } from './gamepad-focus'
import {
  keyboard,
  inputField,
  fieldGroup,
  autoKeyboardEnabled,
  setAutoKeyboard,
} from './keyboard'
import {
  keyLayout,
  accentsFor,
  hasAccents,
  keyRects,
  keyboardHeight,
  keyAt,
} from './key-layout'
import { table } from './table'

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
}

// Types for the ui.* family (top-level — PascalCase, no namespace pollution)
export type {
  FlowItem,
  FlowOptions,
  FlowBox,
  FlowResult,
  PopupSide,
} from './flow-layout'
export type {
  Box,
  BoxChild,
  BoxChildState,
  BoxOptions,
  PointerKind,
} from './box'
export type { Surface, Popup, MenuItem } from './surface'
export type { EditState } from './text-edit'
export type { SelectionMode } from './selection'
export type { ColumnSpec, ColumnRect, RowWindow } from './table-layout'
export type {
  FocusTarget,
  FocusPulse,
  GamepadFocusOptions,
} from './gamepad-focus'
export type {
  Keyboard,
  InputField,
  KeyboardOptions,
  InputFieldOptions,
} from './keyboard'
export type { KeyboardMode, KeyAction, KeyDef, KeyRect } from './key-layout'

// Procedural biome shader (TERRAIN-SHADER-DESIGN.md): pure chart model + plugin
export {
  mantaAxes,
  planetaryAxes,
  chartUV,
  cellBlend,
  slopeMask,
  photicFactor,
} from './biome-chart'
export type { BiomeChartConfig } from './biome-chart'
// Slope profiles — levels adjustments for terrain, localizable across regions
export {
  cliffProfile,
  beachProfile,
  rollingProfile,
  mesaProfile,
  terraceProfile,
  blendProfiles,
  profileField,
} from './slope-profile'
export type { LocalizedFilter } from './slope-profile'
export {
  volcano,
  impactCrater,
  pad,
  gulley,
  cover,
  composeLandforms,
  mergeProvinces,
} from './landform'
// Volumetric patch substrate (tunnels/caverns — see TODO 0.7.0)
export { latticeHash, latticePoint, extractChunk } from './sdf-lattice'
/*
The CARVE family lives in a container for the same reason the `ui` family does
(see the note above): `box`, `sphere`, `tube`, `union` are COMMON NOUNS, and a
library barrel that exports them bare collides with every consumer's own
vocabulary. `box` was the sharp end — a second one here would have shadowed
`ui.box`, which is exactly the collision the 0.6.0 rc gate namespaced `ui` to
prevent. Caught by the 0.7.0 gate while the window was still free.
*/
import {
  applyCarve,
  sphere,
  capsule,
  tube,
  box as carveBox,
  union,
  smoothUnion,
  flange,
  subtract,
  intersect,
  roughen,
  warp,
  shaft,
} from './carve'
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
}
export type { Carve, NoiseOptions, Vec3Like } from './carve'
export {
  terrainDensity,
  composePatches,
  circleFootprint,
  marginBlend,
} from './patch-field'
export type { PatchField, Footprint } from './patch-field'
export type {
  SdfField,
  LatticeConfig,
  ChunkSpec,
  ExtractedMesh,
} from './sdf-lattice'
export type {
  AuthoredLandform,
  VolcanoOptions,
  CraterOptions,
  PadOptions,
  GulleyOptions,
  CoverOptions,
} from './landform'
export {
  BiomePlugin,
  attachBiomePlugin,
  defaultBiomeParams,
  MANTA_PALETTE,
  LAVA_PALETTE,
  CRYOVOLCANIC_PALETTE,
} from './biome-plugin'
export type { BiomeParams } from './biome-plugin'

// Effects & interaction
export { B3dParticles, b3dParticles } from './b3d-particles'
export { B3dSound, b3dSound } from './b3d-sound'
export { B3dTrigger, b3dTrigger } from './b3d-trigger'
// Interactive: the substrate for touching a thing — doors, knobs, switches, locks.
export { B3dInteractive, b3dInteractive } from './b3d-interactive'
export {
  InteractiveBehavior,
  nearestInteractive,
  useNearest,
} from './interactive-behavior'
export type {
  InteractionInfo,
  InteractiveHost,
  InteractiveConfig,
} from './interactive-behavior'
export {
  interactStep,
  newInteractState,
  activationVeto,
  withinReach,
} from './interaction'
export type {
  InteractPhase,
  InteractState,
  InteractInput,
  InteractResult,
} from './interaction'
// Death: the exit a crash needs (wreckage, orbit camera, respawn panel)
export { B3dDeath, b3dDeath } from './b3d-death'
// Wreck fall: the pure tumbling-descent model b3d-death drops a corpse with.
export { newWreckFall, wreckFallStep, tumbleAxis } from './wreck-fall'
// Buoyancy: the pure vertical model behind the biped's swimming.
export {
  buoyantStep,
  submergedFraction,
  equilibriumSubmersion,
  isSwimming,
} from './buoyancy'
export type { BuoyancyParams } from './buoyancy'
// Swim aim: the pure model behind look-directed swimming.
export {
  clampAim,
  aimFromLook,
  integrateAim,
  easeAim,
  aimTarget,
} from './swim-aim'
export type { WreckFallState, WreckFallParams } from './wreck-fall'
// Spawner: keeps the world populated with encounters (prefab + a rule).
export { B3dSpawner, b3dSpawner } from './b3d-spawner'
// Formations: pure placement patterns for an encounter's members.
export { ring, vee, escorts, line, at } from './formations'
export type { Offset, RingOptions, VeeOptions } from './formations'
// Prefabs: a named factory that instantiates a package of stuff at a pose (remains, loot,
// spawner payloads, pickups). See prefab.ts.
export { definePrefab, getPrefab, prefabNames, spawnPrefab } from './prefab'
export type { Prefab, PrefabContext, PrefabVec3 } from './prefab'
export { explodeMesh } from './b3d-exploder'
export type { ExplodeOptions } from './b3d-exploder'

// Procedural
export { PerlinNoise } from './perlin-noise'
export { MersenneTwister, PRNG } from './mersenne-twister'
export { B3dTerrain, b3dTerrain } from './b3d-terrain'
export { B3dPlanet, b3dPlanet } from './b3d-planet'
export { B3dStar, b3dStar } from './b3d-star'
export { B3dBlackHole, b3dBlackHole } from './b3d-black-hole'
export { B3dGalaxy, b3dGalaxy } from './b3d-galaxy'
export { B3dStarSystem, b3dStarSystem } from './b3d-star-system'
export {
  generateGalaxy,
  generateStarSystem,
  starTypeData,
  randomName,
  capitalize,
  romanNumeral,
} from './galaxy-data'
export type {
  StarData,
  PlanetData,
  StarSystemData,
  GalaxyData,
  GalaxyOptions,
  StarTypeInfo,
  NebulaData,
} from './galaxy-data'
export type { GradientFilter, ControlPoint } from './gradient-filter'
export {
  PiecewiseLinearFilter,
  identityFilter,
  plateauFilter,
} from './gradient-filter'
export { GradientEditor, gradientEditor } from './gradient-editor'
export { TorusSampler, SphereSampler, CylinderSampler } from './surface-sampler'
export type { SurfaceSampler, Vec3 } from './surface-sampler'
// Combat — pure, deterministic models (see COMBAT-DESIGN.md)
export {
  makeResource,
  drain,
  refill,
  regenTick,
  isEmpty,
  isFull,
  fraction,
} from './resource'
export type { Resource } from './resource'
export { CombatWorld, DEFAULT_CHAIN_DELAY } from './destroyable'
export type {
  Destroyable,
  DestroyableSpec,
  ChainLink,
  CombatEvent,
} from './destroyable'
export { B3dDestroyable, b3dDestroyable } from './b3d-destroyable'
export { DestroyableBehavior } from './destroyable-behavior'
export type { DeathOutcome, DestroyableHost } from './destroyable-behavior'
export {
  B3dWarhead,
  b3dWarhead,
  detonateWarhead,
  explosionFx,
} from './b3d-warhead'
export {
  B3dLauncher,
  b3dLauncher,
  spawnProjectile,
  spawnMissile,
} from './b3d-launcher'
export type { ProjectileOpts, MissileOpts, Impact } from './b3d-launcher'
export { createMakers } from './make-mesh'
export { roundedRectGeometry, signedArea } from './rounded-rect'
export type { RoundedRectOptions, RoundedRectGeometry } from './rounded-rect'
export { openPopup } from './popup-surface'
export type { PopupSurface, PopupSurfaceOptions } from './popup-surface'
export type { Vector3dOptions, VectorField } from './vector-field'
export type { Makers, MakeOptions, MakeOwner } from './make-mesh'
export { B3dTurret, b3dTurret } from './b3d-turret'
export { B3dRadarBlip, b3dRadarBlip } from './b3d-radar-blip'
export { B3dRadar, b3dRadar } from './b3d-radar'
export { Radar, coneDotFromDegrees, isOpposed } from './radar'
export type { RadarContact, RadarTrack, RadarParams } from './radar'
export {
  steerToward,
  proNav,
  interceptLead,
  boostAuthority,
  gAdd,
  gSub,
  gScale,
  gDot,
  gCross,
  gLen,
  gNormalize,
} from './guidance'
export {
  canonicalize,
  normalizeScale,
  findCenterOfGravity,
  applyCenterOfGravity,
} from './model-transform'
export { aoeFalloff, resolveAoe, dist3 } from './warhead'
export type { WarheadSpec, AoeTarget } from './warhead'
export { ballisticStep, predictPath, ballisticAim } from './ballistics'
export type {
  BallisticParams,
  BallisticState,
  PredictOptions,
} from './ballistics'

// Data table types (the value lives at ui.table)
export type { Table, TableRow, TableOptions } from './table'

export { modeForType, isValidForType, commitValueForType } from './key-layout'
export type { FieldType } from './key-layout'

export { w3dTheme, setW3dTheme, withTheme } from './w3d-theme'
export type { W3dTheme } from './w3d-theme'
export { waterNormalTexture, tileHeight, writeNormalMap } from './water-normal'
export { themeEditor, FONT_STACKS } from './theme-editor'
export type { ThemeEditorOptions } from './theme-editor'
export {
  registerSvgFont,
  unregisterSvgFont,
  fontFaceCss,
  svgFontStyle,
  base64OfBytes,
} from './embed-font'
export type { EmbeddedFont } from './embed-font'
