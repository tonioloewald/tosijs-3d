// Core
export { B3d, b3d } from './tosi-b3d'
export type { SceneAdditions, SceneAdditionHandler } from './tosi-b3d'

// Utilities
export { findB3dOwner, AbstractMesh, actualMeshes, enterXR } from './b3d-utils'
export type { XRStuff, XRParams } from './b3d-utils'

// Scene components
export { B3dLoader, b3dLoader } from './b3d-loader'
export { B3dLibrary, b3dLibrary } from './b3d-library'
export { B3dSun, b3dSun } from './b3d-shadows'
export { B3dReflections, b3dReflections } from './b3d-reflections'
export { B3dSkybox, b3dSkybox } from './b3d-skybox'
export { B3dWater, b3dWater } from './b3d-water'
export { B3dLight, b3dLight } from './b3d-light'
export { B3dFog, b3dFog } from './b3d-fog'
export { B3dSphere, b3dSphere, B3dGround, b3dGround } from './b3d-primitives'
export { B3dButton, b3dButton } from './b3d-button'
export { B3dCollisions, b3dCollisions } from './b3d-collisions'
export { B3dPhysics, b3dPhysics } from './b3d-physics'
export { JoltPlugin } from './jolt-plugin'

// Input abstraction
export type { ControlInput, InputProvider } from './control-input'
export { emptyInput, CompositeInputProvider } from './control-input'
export { XRInputProvider } from './xr-input-provider'
export { B3dControllable } from './b3d-controllable'

// Virtual gamepad system
export type {
  VirtualGamepad,
  GamepadSource,
  InputMapping,
  ThrottleDetentConfig,
} from './virtual-gamepad'
export {
  emptyGamepad,
  mergeGamepads,
  bipedMapping,
  carMapping,
  aircraftMapping,
  MappedInputProvider,
} from './virtual-gamepad'
export { KeyboardGamepadSource, keyboardGamepad } from './keyboard-gamepad'
export { HardwareGamepadSource } from './hardware-gamepad'

// Character & input
export { B3dBiped, b3dBiped, AnimState } from './b3d-biped'
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

// SVG material system
export { SvgTexture } from './svg-texture'
export type { SvgTextureOptions } from './svg-texture'
export { B3dSvgPlane, b3dSvgPlane } from './b3d-svg-plane'

// Effects & interaction
export { B3dParticles, b3dParticles } from './b3d-particles'
export { B3dSound, b3dSound } from './b3d-sound'
export { B3dTrigger, b3dTrigger } from './b3d-trigger'
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
