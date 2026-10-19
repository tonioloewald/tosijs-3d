/*
THE EFFECT VOICES, synthesised (EFFECTS-DESIGN.md → "No files"): noise and
oscillators through filters, one small graph per voice, positioned with a
PannerNode. Thunder (`b3d-lightning`) showed the approach: made, not loaded.

A voice is LIVE: the effect player sets its gain, pitch and filter every
frame from the layer's curves (sampled late by the distance, so sound
arrives at 343 m/s), and stops it with a short fade. Voices share a POOL
whose cap comes from the device tier; over it, the quietest yields.

Browsers only play audio after a user gesture. Until then a voice is not
started at all (the effect plays silently), exactly as thunder is skipped.
*/

import * as BABYLON from '@babylonjs/core'
import type { VoiceKind } from './effect-recipe.js'

let ctx: AudioContext | null = null
const buffers = new Map<string, AudioBuffer>()

/** The shared audio context, running, or null (no audio yet, or none). */
export function effectAudio(): AudioContext | null {
  try {
    if (ctx == null) {
      const C =
        (globalThis as any).AudioContext ?? (globalThis as any).webkitAudioContext
      if (C == null) return null
      ctx = new C() as AudioContext
    }
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx.state === 'running' ? ctx : null
  } catch {
    return null
  }
}

/** Looping noise: white, brown (rolling, low) or crackle (sparse clicks). */
function noise(ac: AudioContext, kind: 'white' | 'brown' | 'crackle'): AudioBuffer {
  const key = `${kind}:${ac.sampleRate}`
  let b = buffers.get(key)
  if (b != null) return b
  const len = ac.sampleRate * 3
  b = ac.createBuffer(1, len, ac.sampleRate)
  const d = b.getChannelData(0)
  let s = 12345
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1
  let brown = 0
  for (let i = 0; i < len; i++) {
    if (kind === 'white') d[i] = rnd() * 0.5
    else if (kind === 'brown') {
      brown = (brown + 0.02 * rnd()) / 1.02
      d[i] = brown * 3.5
    } else {
      // About forty clicks a second, each a few samples of decaying noise.
      d[i] = 0
      if (Math.abs(rnd()) < 40 / ac.sampleRate) {
        const amp = 0.3 + 0.7 * Math.abs(rnd())
        for (let k = 0; k < 80 && i + k < len; k++)
          d[i + k] += rnd() * amp * Math.exp(-k / 12)
      }
    }
  }
  buffers.set(key, b)
  return b
}

export interface Voice {
  /** Gain 0 to 1 (before distance), pitch multiplier, filter 0 to 1. */
  set(gain: number, pitch: number, cutoff: number, distanceCutoffHz: number): void
  /** Where it is, in the world. */
  place(p: BABYLON.Vector3): void
  stop(): void
  /** The level it was last set to, for the pool. */
  readonly level: number
}

interface Graph {
  out: AudioNode
  /** Sources to start and stop, with their base playback rate or frequency. */
  sources: Array<AudioBufferSourceNode | OscillatorNode>
  /** The filter the cutoff channel moves, and its range. */
  filter?: BiquadFilterNode
  lo?: number
  hi?: number
}

function src(ac: AudioContext, kind: 'white' | 'brown' | 'crackle'): AudioBufferSourceNode {
  const n = ac.createBufferSource()
  n.buffer = noise(ac, kind)
  n.loop = true
  // Start each at a different place in the loop, so two voices differ.
  ;(n as any)._offset = Math.random() * 2.5
  return n
}
function filt(ac: AudioContext, type: BiquadFilterType, f: number, q = 0.7): BiquadFilterNode {
  const n = ac.createBiquadFilter()
  n.type = type
  n.frequency.value = f
  n.Q.value = q
  return n
}
function mix(ac: AudioContext, k: number): GainNode {
  const g = ac.createGain()
  g.gain.value = k
  return g
}

/** One graph per voice: the sound of each, in filters. */
function build(ac: AudioContext, kind: VoiceKind): Graph {
  const out = mix(ac, 1)
  switch (kind) {
    case 'rumble': {
      const s = src(ac, 'brown')
      const f = filt(ac, 'lowpass', 110)
      s.connect(f).connect(mix(ac, 2.2)).connect(out)
      return { out, sources: [s], filter: f, lo: 50, hi: 220 }
    }
    case 'roar': {
      const a = src(ac, 'brown')
      const b = src(ac, 'white')
      const f = filt(ac, 'lowpass', 700)
      a.connect(mix(ac, 1.6)).connect(f)
      b.connect(filt(ac, 'bandpass', 380, 0.6)).connect(mix(ac, 0.9)).connect(f)
      f.connect(out)
      return { out, sources: [a, b], filter: f, lo: 200, hi: 1600 }
    }
    case 'hiss': {
      const s = src(ac, 'white')
      const f = filt(ac, 'lowpass', 7000)
      s.connect(filt(ac, 'highpass', 1800)).connect(f).connect(mix(ac, 1.2)).connect(out)
      return { out, sources: [s], filter: f, lo: 2500, hi: 12000 }
    }
    case 'boom': {
      const s = src(ac, 'brown')
      const f = filt(ac, 'lowpass', 900)
      s.connect(f).connect(mix(ac, 3)).connect(out)
      const o = ac.createOscillator()
      o.type = 'sine'
      o.frequency.value = 48
      o.connect(mix(ac, 0.6)).connect(out)
      // The body of a boom falls: the cutoff channel sweeps it, and the
      // filter starts bright and closes on its own as well.
      f.frequency.setValueAtTime(1400, ac.currentTime)
      f.frequency.exponentialRampToValueAtTime(120, ac.currentTime + 1.2)
      return { out, sources: [s, o], filter: f, lo: 90, hi: 1400 }
    }
    case 'crackle': {
      const s = src(ac, 'crackle')
      const f = filt(ac, 'highpass', 900)
      s.connect(f).connect(mix(ac, 1.5)).connect(out)
      return { out, sources: [s] }
    }
    case 'whoosh': {
      const s = src(ac, 'white')
      const f = filt(ac, 'bandpass', 500, 0.9)
      const lfo = ac.createOscillator()
      lfo.frequency.value = 0.6
      lfo.connect(mix(ac, 250)).connect(f.frequency)
      const b = src(ac, 'brown')
      b.connect(filt(ac, 'lowpass', 300)).connect(mix(ac, 1.2)).connect(out)
      s.connect(f).connect(mix(ac, 1.4)).connect(out)
      return { out, sources: [s, b, lfo], filter: f, lo: 250, hi: 1200 }
    }
    case 'buzz': {
      const o = ac.createOscillator()
      o.type = 'sawtooth'
      o.frequency.value = 120
      const f = filt(ac, 'bandpass', 900, 1.8)
      // Gated by crackle: an arc that catches and drops.
      const gate = mix(ac, 0)
      const c = src(ac, 'crackle')
      c.connect(mix(ac, 6)).connect(gate.gain)
      o.connect(f).connect(gate).connect(mix(ac, 0.8)).connect(out)
      c.connect(filt(ac, 'highpass', 2000)).connect(mix(ac, 0.8)).connect(out)
      return { out, sources: [o, c], filter: f, lo: 400, hi: 2400 }
    }
    case 'splash': {
      const s = src(ac, 'white')
      const f = filt(ac, 'bandpass', 1600, 0.7)
      s.connect(f).connect(mix(ac, 1.6)).connect(out)
      return { out, sources: [s], filter: f, lo: 600, hi: 3500 }
    }
  }
}

/** A voice, or null when audio cannot play yet. `url` plays a sample. */
export function startVoice(
  kind: VoiceKind,
  options: { refDistance?: number; url?: string } = {}
): Voice | null {
  const ac = effectAudio()
  if (ac == null) return null
  const g: Graph =
    options.url != null ? sample(ac, options.url) : build(ac, kind)
  const level = ac.createGain()
  level.gain.value = 0
  const far = filt(ac, 'lowpass', 18000)
  const pan = ac.createPanner()
  pan.panningModel = 'HRTF'
  pan.distanceModel = 'inverse'
  pan.refDistance = options.refDistance ?? 10
  pan.rolloffFactor = 1
  g.out.connect(level).connect(far).connect(pan).connect(ac.destination)
  const base = g.sources.map((s) =>
    s instanceof OscillatorNode ? s.frequency.value : s.playbackRate.value
  )
  for (const s of g.sources) {
    try {
      if (s instanceof AudioBufferSourceNode) s.start(0, (s as any)._offset ?? 0)
      else s.start()
    } catch {
      /* started */
    }
  }
  let current = 0
  let stopped = false
  return {
    get level() {
      return current
    },
    set(gain, pitch, cutoff, distanceHz) {
      if (stopped) return
      const t = ac.currentTime
      current = gain
      level.gain.setTargetAtTime(gain, t, 0.03)
      g.sources.forEach((s, i) => {
        if (s instanceof OscillatorNode) s.frequency.setTargetAtTime(base[i] * pitch, t, 0.05)
        else s.playbackRate.setTargetAtTime(base[i] * pitch, t, 0.05)
      })
      if (g.filter != null && g.lo != null && g.hi != null)
        g.filter.frequency.setTargetAtTime(
          g.lo * Math.pow(g.hi / g.lo, Math.max(0, Math.min(1, cutoff))),
          t,
          0.05
        )
      far.frequency.setTargetAtTime(distanceHz, t, 0.1)
    },
    place(p) {
      const t = ac.currentTime
      pan.positionX.setTargetAtTime(p.x, t, 0.02)
      pan.positionY.setTargetAtTime(p.y, t, 0.02)
      // Babylon is left-handed, WebAudio right-handed: flip z.
      pan.positionZ.setTargetAtTime(-p.z, t, 0.02)
    },
    stop() {
      if (stopped) return
      stopped = true
      const t = ac.currentTime
      level.gain.setTargetAtTime(0, t, 0.05)
      for (const s of g.sources) {
        try {
          s.stop(t + 0.4)
        } catch {
          /* never started */
        }
      }
      setTimeout(() => {
        try {
          pan.disconnect()
        } catch {
          /* gone */
        }
      }, 600)
    },
  }
}

/** A sample voice: the file, looped, fetched once per URL. */
function sample(ac: AudioContext, url: string): Graph {
  const out = mix(ac, 1)
  const s = ac.createBufferSource()
  s.loop = true
  const cached = buffers.get(url)
  if (cached != null) s.buffer = cached
  else
    void fetch(url)
      .then((r) => r.arrayBuffer())
      .then((b) => ac.decodeAudioData(b))
      .then((b) => {
        buffers.set(url, b)
        try {
          s.buffer = b
        } catch {
          /* already playing a buffer */
        }
      })
      .catch(() => {})
  s.connect(out)
  return { out, sources: [s] }
}

/** Put the listener where the camera is, looking where it looks. */
export function placeListener(camera: BABYLON.Camera): void {
  const ac = ctx
  if (ac == null || ac.state !== 'running') return
  const l = ac.listener
  const p = camera.globalPosition
  const f = camera.getDirection(BABYLON.Axis.Z)
  const u = camera.getDirection(BABYLON.Axis.Y)
  const t = ac.currentTime
  if (l.positionX != null) {
    l.positionX.setTargetAtTime(p.x, t, 0.02)
    l.positionY.setTargetAtTime(p.y, t, 0.02)
    l.positionZ.setTargetAtTime(-p.z, t, 0.02)
    l.forwardX.setTargetAtTime(f.x, t, 0.02)
    l.forwardY.setTargetAtTime(f.y, t, 0.02)
    l.forwardZ.setTargetAtTime(-f.z, t, 0.02)
    l.upX.setTargetAtTime(u.x, t, 0.02)
    l.upY.setTargetAtTime(u.y, t, 0.02)
    l.upZ.setTargetAtTime(-u.z, t, 0.02)
  }
}
