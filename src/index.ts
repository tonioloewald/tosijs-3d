// Core
export { B3d, b3d } from './tosi-b3d'
export type { SceneAdditions, SceneAdditionHandler } from './tosi-b3d'

// Utilities
export { findB3dOwner, AbstractMesh, actualMeshes, enterXR } from './b3d-utils'
export type { XRStuff, XRParams } from './b3d-utils'

// Scene components
export { B3dLoader, b3dLoader } from './b3d-loader'
export { B3dSun, b3dSun } from './b3d-shadows'
export { B3dReflections, b3dReflections } from './b3d-reflections'
export { B3dSkybox, b3dSkybox } from './b3d-skybox'
export { B3dWater, b3dWater } from './b3d-water'
export { B3dLight, b3dLight } from './b3d-light'
export { B3dFog, b3dFog } from './b3d-fog'
export { B3dSphere, b3dSphere, B3dGround, b3dGround } from './b3d-primitives'
export { B3dButton, b3dButton } from './b3d-button'
export { B3dCollisions, b3dCollisions } from './b3d-collisions'

// Input abstraction
export type { ControlInput, InputProvider } from './control-input'
export { emptyInput, CompositeInputProvider } from './control-input'
export { XRInputProvider } from './xr-input-provider'
export { B3dControllable } from './b3d-controllable'

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

// Procedural
export { PerlinNoise } from './perlin-noise'
export { B3dTerrain, b3dTerrain } from './b3d-terrain'
export type { GradientFilter, ControlPoint } from './gradient-filter'
export {
  PiecewiseLinearFilter,
  identityFilter,
  plateauFilter,
} from './gradient-filter'
export { GradientEditor, gradientEditor } from './gradient-editor'
export { TorusSampler, SphereSampler, CylinderSampler } from './surface-sampler'
export type { SurfaceSampler, Vec3 } from './surface-sampler'
