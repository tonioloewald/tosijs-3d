/*
THE STEP-1 EFFECT PRESETS (EFFECTS-DESIGN.md), as recipes: volcano (one
recipe, dormant to erupting by ACTIVITY), geyser, splash, explosion,
fireball and electrical sparks. Stylized: bold, readable shapes, a few
large particles over many small ones. Pure data; `effectPreset(name)` hands
out a copy, so editing one never edits the preset.

Sizes are for a person-scale world (1 unit = 1 m). A volcano preset is a
vent a few metres across, not a mountain: put it on one (landform's
volcano) and scale the element.
*/

import {
  EFFECT_RECIPE_VERSION,
  type EffectCurve,
  type EffectRecipe,
} from './effect-recipe.js'

/** Attack fast, hold, fall off: a pulse over a layer's life. */
const pulse = (attack = 0.05, hold = 0.2): EffectCurve => [
  { x: 0, y: 0 },
  { x: attack, y: 1 },
  { x: attack + hold, y: 0.8 },
  { x: 1, y: 0 },
]
/** Full at once, then fades. */
const fade: EffectCurve = [
  { x: 0, y: 1 },
  { x: 1, y: 0 },
]
/** Only near the top of the dial. */
const above = (from: number): EffectCurve => [
  { x: 0, y: 0 },
  { x: from, y: 0 },
  { x: 1, y: 1 },
]
/** Only between dormant and erupting: off when quiet, half at full eruption. */
const midRange: EffectCurve = [
  { x: 0, y: 0 },
  { x: 0.3, y: 0 },
  { x: 0.45, y: 1 },
  { x: 0.85, y: 1 },
  { x: 1, y: 0.5 },
]
/** Present even when quiet, more when busy. */
const floor = (min: number): EffectCurve => [
  { x: 0, y: min },
  { x: 1, y: 1 },
]

export const EFFECT_PRESETS: Record<string, EffectRecipe> = {
  /*
  VOLCANO: steam always; ash, glow and the odd burst of spatter and cinders
  as it wakes; lava bombs and the roar only when it erupts. Activity 0.15
  dormant, 0.5 semi-active, 1 erupting.
  */
  volcano: {
    version: EFFECT_RECIPE_VERSION,
    name: 'volcano',
    activity: 0.5,
    layers: [
      {
        kind: 'particles',
        name: 'steam',
        sprite: 'puff',
        blend: 'alpha',
        emitter: { shape: 'disc', radius: 1.5 },
        rate: 6,
        life: [4, 7],
        speed: [0.6, 1.2],
        size: [1.2, 2.2],
        gravity: -0.4,
        wind: 0.8,
        colors: ['#e8e4dc70', '#d8d2c840', '#c8c0b800'],
        grow: [
          { x: 0, y: 0.5 },
          { x: 1, y: 2.2 },
        ],
        activity: floor(0.6),
      },
      {
        kind: 'particles',
        name: 'ash column',
        sprite: 'smoke',
        blend: 'alpha',
        emitter: { shape: 'cone', radius: 1.2, angleDeg: 12 },
        rate: 45,
        life: [5, 9],
        speed: [8, 14],
        size: [2.5, 4.5],
        gravity: -0.6,
        drag: 0.35,
        wind: 1,
        colors: ['#3a3430e0', '#4a443ec0', '#5a545060'],
        grow: [
          { x: 0, y: 0.6 },
          { x: 1, y: 3 },
        ],
        activity: above(0.3),
      },
      {
        kind: 'particles',
        name: 'lava bombs',
        sprite: 'ember',
        blend: 'add',
        emitter: { shape: 'cone', radius: 0.8, angleDeg: 30 },
        rate: 22,
        life: [2.5, 4],
        speed: [12, 22],
        size: [0.45, 0.9],
        gravity: 9.8,
        stretch: true,
        land: true,
        colors: ['#fff2a0', '#ff8020', '#c02800', '#40100000'],
        activity: above(0.75),
      },
      /*
      SPATTER: a semi-active vent throws a few blobs and cinders now and
      then, in bursts on two different periods so they never fall into step.
      Only between dormant and erupting; at full eruption the bombs take over.
      */
      {
        kind: 'particles',
        name: 'spatter',
        sprite: 'ember',
        blend: 'add',
        height: 0.3,
        emitter: { shape: 'cone', radius: 0.6, angleDeg: 25 },
        rate: 0,
        burst: 6,
        duration: 3.7,
        repeat: true,
        life: [1.4, 2.4],
        speed: [6, 11],
        size: [0.3, 0.6],
        gravity: 9.8,
        stretch: true,
        land: true,
        colors: ['#fff2a0', '#ff8020', '#c02800', '#40100000'],
        activity: midRange,
      },
      {
        kind: 'particles',
        name: 'cinders',
        sprite: 'spark',
        blend: 'add',
        height: 0.3,
        emitter: { shape: 'cone', radius: 0.5, angleDeg: 35 },
        rate: 0,
        burst: 16,
        duration: 2.3,
        repeat: true,
        life: [0.8, 1.6],
        speed: [5, 10],
        size: [0.06, 0.12],
        gravity: 9.8,
        stretch: true,
        land: true,
        wind: 0.4,
        colors: ['#fff8d0', '#ffb040', '#ff602000'],
        activity: midRange,
      },
      {
        kind: 'particles',
        name: 'vent glow',
        sprite: 'glow',
        blend: 'add',
        height: 0.4,
        emitter: { shape: 'disc', radius: 1 },
        rate: 24,
        life: [0.5, 0.9],
        speed: [0.5, 2],
        size: [2, 3.5],
        colors: ['#ffd070c0', '#ff6a2080', '#a0200000'],
        activity: above(0.4),
      },
      {
        kind: 'light',
        name: 'glow',
        color: '#ff5a1e',
        intensity: 6,
        range: 30,
        height: 2,
        flicker: 0.35,
        activity: above(0.25),
      },
      {
        kind: 'sound',
        name: 'rumble',
        voice: 'rumble',
        gain: 0.6,
        refDistance: 40,
        activity: floor(0.25),
      },
      {
        kind: 'sound',
        name: 'roar',
        voice: 'roar',
        gain: 0.8,
        refDistance: 40,
        activity: above(0.7),
      },
    ],
  },

  /*
  GEYSER: a column every eight seconds (a repeating layer is its period),
  a hiss that rises with it, and steam drifting off between.
  */
  geyser: {
    version: EFFECT_RECIPE_VERSION,
    name: 'geyser',
    layers: [
      {
        kind: 'particles',
        name: 'column',
        sprite: 'drop',
        blend: 'alpha',
        emitter: { shape: 'cone', radius: 0.25, angleDeg: 5 },
        rate: 160,
        duration: 8,
        repeat: true,
        life: [1.6, 2.4],
        speed: [12, 16],
        size: [0.2, 0.45],
        gravity: 9.8,
        wind: 0.3,
        colors: ['#ffffffd0', '#e0f0ffa0', '#c8e0f000'],
        channels: { rate: pulse(0.12, 0.25), speed: pulse(0.1, 0.3) },
      },
      {
        kind: 'particles',
        name: 'steam',
        sprite: 'puff',
        blend: 'alpha',
        emitter: { shape: 'disc', radius: 0.6 },
        rate: 18,
        duration: 8,
        repeat: true,
        life: [3, 5],
        speed: [1.5, 3],
        size: [0.8, 1.6],
        gravity: -0.5,
        wind: 1,
        colors: ['#ffffff90', '#f0f0f050', '#e0e0e000'],
        grow: [
          { x: 0, y: 0.6 },
          { x: 1, y: 2.5 },
        ],
        channels: { rate: floor(0.15) as EffectCurve },
      },
      {
        kind: 'sound',
        name: 'hiss',
        voice: 'hiss',
        gain: 0.7,
        duration: 8,
        repeat: true,
        channels: { gain: pulse(0.12, 0.25), cutoff: pulse(0.1, 0.3) },
      },
    ],
  },

  /*
  BUBBLES: a vent or a leak on the bottom. Bubbles rise in a zigzag, grow as
  the pressure falls, and end at the surface (the water element's level),
  with a bubbling you hear underwater.
  */
  bubbles: {
    version: EFFECT_RECIPE_VERSION,
    name: 'bubbles',
    layers: [
      {
        kind: 'particles',
        name: 'bubbles',
        sprite: 'bubble',
        blend: 'alpha',
        emitter: { shape: 'disc', radius: 0.15 },
        rate: 24,
        life: [6, 12],
        speed: [0.3, 0.8],
        size: [0.04, 0.14],
        gravity: -1.2,
        drag: 0.5,
        wobble: 0.22,
        surface: true,
        colors: ['#eaf8ffe0', '#d8f2ffc0', '#c8ecff90'],
        grow: [
          { x: 0, y: 0.8 },
          { x: 1, y: 1.7 },
        ],
      },
      {
        kind: 'particles',
        name: 'fizz',
        sprite: 'bubble',
        blend: 'alpha',
        emitter: { shape: 'disc', radius: 0.25 },
        rate: 40,
        life: [3, 6],
        speed: [0.2, 0.5],
        size: [0.015, 0.035],
        gravity: -0.8,
        drag: 0.6,
        wobble: 0.12,
        surface: true,
        colors: ['#ffffffb0', '#e0f4ff70'],
      },
      {
        kind: 'sound',
        name: 'bubbling',
        voice: 'bubble',
        gain: 0.5,
        refDistance: 6,
      },
    ],
  },

  /*
  BLACK SMOKER: a hydrothermal vent on the sea floor. A dark mineral plume
  billowing up, a dull glow at the chimney, bubbles in it, and a low roar.
  */
  'black smoker': {
    version: EFFECT_RECIPE_VERSION,
    name: 'black smoker',
    layers: [
      {
        kind: 'particles',
        name: 'plume',
        sprite: 'smoke',
        blend: 'alpha',
        height: 0.2,
        emitter: { shape: 'cone', radius: 0.3, angleDeg: 10 },
        rate: 16,
        life: [5, 9],
        speed: [0.8, 1.6],
        size: [0.5, 1.1],
        gravity: -0.3,
        drag: 0.4,
        wobble: 0.08,
        colors: ['#141210e0', '#24201cb0', '#3a342e00'],
        grow: [
          { x: 0, y: 0.5 },
          { x: 1, y: 3.2 },
        ],
      },
      {
        kind: 'particles',
        name: 'bubbles',
        sprite: 'bubble',
        blend: 'alpha',
        emitter: { shape: 'disc', radius: 0.2 },
        rate: 8,
        life: [6, 12],
        speed: [0.3, 0.7],
        size: [0.03, 0.09],
        gravity: -1.2,
        drag: 0.5,
        wobble: 0.2,
        surface: true,
        colors: ['#eaf8ffd0', '#c8ecff80'],
        grow: [
          { x: 0, y: 0.8 },
          { x: 1, y: 1.6 },
        ],
      },
      {
        kind: 'light',
        name: 'chimney glow',
        color: '#ff6a2a',
        intensity: 1.5,
        range: 4,
        height: 0.3,
        flicker: 0.3,
      },
      {
        kind: 'sound',
        name: 'roar',
        voice: 'rumble',
        gain: 0.4,
        refDistance: 8,
      },
      {
        kind: 'sound',
        name: 'bubbling',
        voice: 'bubble',
        gain: 0.25,
        refDistance: 6,
      },
    ],
  },

  /* SPLASH: a crown of drops, spray, and the sound of it. */
  splash: {
    version: EFFECT_RECIPE_VERSION,
    name: 'splash',
    duration: 2.5,
    layers: [
      {
        kind: 'particles',
        name: 'crown',
        sprite: 'drop',
        blend: 'alpha',
        emitter: { shape: 'ring', radius: 0.35, angleDeg: 25 },
        rate: 0,
        burst: 70,
        life: [0.7, 1.2],
        speed: [3, 5],
        size: [0.08, 0.18],
        gravity: 9.8,
        stretch: true,
        colors: ['#ffffffe0', '#d8ecffb0', '#c0e0ff00'],
      },
      {
        kind: 'particles',
        name: 'spray',
        sprite: 'puff',
        blend: 'alpha',
        emitter: { shape: 'disc', radius: 0.3 },
        rate: 0,
        burst: 14,
        life: [0.8, 1.4],
        speed: [0.5, 1.5],
        size: [0.4, 0.8],
        gravity: 0.5,
        wind: 0.6,
        colors: ['#ffffff80', '#ffffff00'],
        grow: [
          { x: 0, y: 0.5 },
          { x: 1, y: 1.8 },
        ],
      },
      {
        kind: 'sound',
        name: 'splash',
        voice: 'splash',
        gain: 0.8,
        duration: 1,
        channels: { gain: fade },
      },
    ],
  },

  /*
  EXPLOSION: the flash lights the ground, the fireball rolls up into smoke,
  sparks and debris fly and land, and the boom arrives at the speed of sound.
  */
  explosion: {
    version: EFFECT_RECIPE_VERSION,
    name: 'explosion',
    duration: 6,
    layers: [
      {
        kind: 'particles',
        name: 'fireball',
        sprite: 'glow',
        blend: 'add',
        height: 1.2,
        emitter: { shape: 'sphere', radius: 0.6 },
        rate: 0,
        burst: 50,
        life: [0.5, 0.9],
        speed: [2, 5],
        size: [2, 3.5],
        gravity: -2,
        drag: 0.8,
        colors: ['#fffbe0', '#ffc040', '#ff5010', '#60100000'],
        grow: [
          { x: 0, y: 0.6 },
          { x: 1, y: 1.6 },
        ],
      },
      {
        kind: 'particles',
        name: 'smoke',
        sprite: 'smoke',
        blend: 'alpha',
        start: 0.25,
        height: 1.5,
        emitter: { shape: 'sphere', radius: 1 },
        rate: 0,
        burst: 40,
        life: [3, 5],
        speed: [1, 3],
        size: [1.5, 3],
        gravity: -1.2,
        drag: 0.6,
        wind: 1,
        colors: ['#302820d0', '#40383080', '#50484000'],
        grow: [
          { x: 0, y: 0.6 },
          { x: 1, y: 2.5 },
        ],
      },
      {
        kind: 'particles',
        name: 'sparks',
        sprite: 'spark',
        blend: 'add',
        height: 1,
        emitter: { shape: 'sphere', radius: 0.3 },
        rate: 0,
        burst: 60,
        life: [0.8, 1.6],
        speed: [8, 16],
        size: [0.06, 0.12],
        gravity: 9.8,
        stretch: true,
        land: true,
        colors: ['#fff8d0', '#ffb040', '#ff602000'],
      },
      {
        kind: 'light',
        name: 'flash',
        color: '#ffb060',
        intensity: 40,
        range: 25,
        height: 1,
        duration: 0.8,
        channels: { intensity: pulse(0.02, 0.05) },
      },
      {
        kind: 'sound',
        name: 'boom',
        voice: 'boom',
        gain: 1,
        duration: 3,
        refDistance: 20,
        channels: { gain: fade },
      },
      {
        kind: 'sound',
        name: 'debris',
        voice: 'crackle',
        gain: 0.4,
        start: 0.2,
        duration: 1.5,
        channels: { gain: fade },
      },
    ],
  },

  /* FIREBALL: a burning ball (nest it in a projectile), its glow and its roar. */
  fireball: {
    version: EFFECT_RECIPE_VERSION,
    name: 'fireball',
    layers: [
      {
        kind: 'particles',
        name: 'core',
        sprite: 'glow',
        blend: 'add',
        emitter: { shape: 'sphere', radius: 0.25 },
        rate: 60,
        life: [0.25, 0.45],
        speed: [0.2, 0.8],
        size: [0.5, 0.9],
        gravity: -1,
        colors: ['#fffbe0', '#ffb030', '#ff401000'],
        grow: fade,
      },
      {
        kind: 'particles',
        name: 'trail',
        sprite: 'smoke',
        blend: 'alpha',
        emitter: { shape: 'sphere', radius: 0.2 },
        rate: 20,
        life: [1, 2],
        speed: [0.1, 0.4],
        size: [0.4, 0.8],
        gravity: -0.6,
        wind: 0.8,
        colors: ['#40302090', '#50483800'],
        grow: [
          { x: 0, y: 0.6 },
          { x: 1, y: 2 },
        ],
      },
      {
        kind: 'light',
        name: 'glow',
        color: '#ff8a30',
        intensity: 8,
        range: 10,
        flicker: 0.25,
      },
      {
        kind: 'sound',
        name: 'roar',
        voice: 'whoosh',
        gain: 0.5,
        refDistance: 8,
      },
    ],
  },

  /* SPARKS: an electrical fault; bursts of stretched sparks, a flicker, a buzz. */
  sparks: {
    version: EFFECT_RECIPE_VERSION,
    name: 'sparks',
    layers: [
      {
        kind: 'particles',
        name: 'sparks',
        sprite: 'spark',
        blend: 'add',
        emitter: { shape: 'sphere', radius: 0.05 },
        rate: 0,
        burst: 25,
        duration: 0.7,
        repeat: true,
        life: [0.3, 0.8],
        speed: [3, 7],
        size: [0.03, 0.06],
        gravity: 9.8,
        stretch: true,
        land: true,
        colors: ['#ffffff', '#b0d8ff', '#4080ff00'],
      },
      {
        kind: 'light',
        name: 'arc light',
        color: '#a8d0ff',
        intensity: 5,
        range: 6,
        duration: 0.7,
        repeat: true,
        flicker: 0.9,
        channels: { intensity: pulse(0.01, 0.08) },
      },
      {
        kind: 'sound',
        name: 'crackle',
        voice: 'buzz',
        gain: 0.5,
        duration: 0.7,
        repeat: true,
        refDistance: 6,
        channels: { gain: pulse(0.01, 0.15) },
      },
    ],
  },
}

/** A copy of a preset (edit it freely), or undefined. */
export function effectPreset(name: string): EffectRecipe | undefined {
  const p = EFFECT_PRESETS[name]
  return p != null ? JSON.parse(JSON.stringify(p)) : undefined
}

/** Activity settings that name a volcano's states. */
export const VOLCANO_STATES = { dormant: 0.15, 'semi-active': 0.5, erupting: 1 }
