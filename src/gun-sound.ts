/*#
# gun-sound

**A shot you hear**, synthesised: no files. `gunshot(scene, at, kind)` plays
one at a world position: a crack of filtered noise and a low thump, each
falling away fast, through a panner placed at the muzzle (the listener is
put where the camera is first). `kind` picks a profile:

| kind | sounds like |
|---|---|
| `pistol` | a sharp crack, little body |
| `rifle` | louder, longer, with a deep thump and a tail |
| `heavy` | a launch: a soft boom and a long whoosh |
| `bow` | a twang: a plucked string, no noise |

`<tosi-b3d-launcher sound="rifle">` plays one on every `fire()`. Like every
effect voice, nothing plays until the page has had a user gesture.
*/
/*{ "parent": "b3d-launcher" }*/

import * as BABYLON from '@babylonjs/core'
import { effectAudio, placeListener } from './effect-audio.js'

export type GunSound = 'pistol' | 'rifle' | 'heavy' | 'bow'

interface Profile {
  /** Peak gain of the crack, its band (Hz) and how long it rings (s). */
  crack: number
  band: number
  crackDecay: number
  /** Peak gain of the thump, its start and end pitch (Hz), its length (s). */
  thump: number
  from: number
  to: number
  thumpDecay: number
}

const PROFILES: Record<Exclude<GunSound, 'bow'>, Profile> = {
  pistol: {
    crack: 0.9,
    band: 2400,
    crackDecay: 0.09,
    thump: 0.5,
    from: 160,
    to: 60,
    thumpDecay: 0.08,
  },
  rifle: {
    crack: 1,
    band: 1600,
    crackDecay: 0.22,
    thump: 0.9,
    from: 120,
    to: 40,
    thumpDecay: 0.18,
  },
  heavy: {
    crack: 0.5,
    band: 700,
    crackDecay: 0.7,
    thump: 1,
    from: 80,
    to: 30,
    thumpDecay: 0.4,
  },
}

let noise: AudioBuffer | null = null
function noiseBuffer(ac: AudioContext): AudioBuffer {
  if (noise && noise.sampleRate === ac.sampleRate) return noise
  const n = Math.floor(ac.sampleRate * 1)
  noise = ac.createBuffer(1, n, ac.sampleRate)
  const d = noise.getChannelData(0)
  // A fixed sequence, so every shot is the same shot (no Math.random in sound either).
  let s = 22222
  for (let i = 0; i < n; i++) {
    s = (s * 16807) % 2147483647
    d[i] = (s / 2147483647) * 2 - 1
  }
  return noise
}

/** A gain node that rises to `peak` at once and falls to silence over `decay`. */
function burst(
  ac: AudioContext,
  t: number,
  peak: number,
  decay: number
): GainNode {
  const g = ac.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(peak, t + 0.003)
  g.gain.exponentialRampToValueAtTime(0.0001, t + decay)
  return g
}

/** Play one shot of `kind` at `at` (world space). Silent before a user gesture. */
export function gunshot(
  scene: BABYLON.Scene,
  at: { x: number; y: number; z: number },
  kind: GunSound
): void {
  const ac = effectAudio()
  if (ac == null) return
  if (scene.activeCamera) placeListener(scene.activeCamera)
  const t = ac.currentTime
  const pan = ac.createPanner()
  pan.panningModel = 'HRTF'
  pan.distanceModel = 'inverse'
  pan.refDistance = 2
  pan.rolloffFactor = 1
  pan.positionX.setValueAtTime(at.x, t)
  pan.positionY.setValueAtTime(at.y, t)
  pan.positionZ.setValueAtTime(at.z, t)
  pan.connect(ac.destination)
  const stopAt = t + 1.2

  if (kind === 'bow') {
    // A plucked string: a triangle wave bending down a little, and a soft thud.
    const o = ac.createOscillator()
    o.type = 'triangle'
    o.frequency.setValueAtTime(220, t)
    o.frequency.exponentialRampToValueAtTime(180, t + 0.25)
    const g = burst(ac, t, 0.5, 0.3)
    o.connect(g).connect(pan)
    o.start(t)
    o.stop(stopAt)
    return
  }

  const p = PROFILES[kind]
  const src = ac.createBufferSource()
  src.buffer = noiseBuffer(ac)
  const bp = ac.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.setValueAtTime(p.band, t)
  bp.frequency.exponentialRampToValueAtTime(p.band * 0.4, t + p.crackDecay)
  bp.Q.value = 0.7
  src.connect(bp).connect(burst(ac, t, p.crack, p.crackDecay)).connect(pan)
  src.start(t)
  src.stop(stopAt)

  const o = ac.createOscillator()
  o.type = 'sine'
  o.frequency.setValueAtTime(p.from, t)
  o.frequency.exponentialRampToValueAtTime(p.to, t + p.thumpDecay)
  o.connect(burst(ac, t, p.thump, p.thumpDecay)).connect(pan)
  o.start(t)
  o.stop(stopAt)
}
