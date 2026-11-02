/*
THE CITY'S SOUND, positional: the traffic's engines, the street lights' hum
(a sputtering buzz from the ones that flicker), and horns. Everything is made,
not loaded (effect-audio's voices), and placed in the world, so it pans and
fades as you drive past.

A city has more sources than a device has voices, so like the lamp pool only
the NEAREST few sound: a handful of engines, a few lamps, horns as they come.
A voice moves to whichever source is nearest now rather than popping on and
off: each source keeps its voice while it stays among the nearest.

Audio starts only after a user gesture (a browser rule); until then this
quietly does nothing and tries again next frame.
*/

import * as BABYLON from '@babylonjs/core'
import { placeListener, startVoice, type Voice } from './effect-audio.js'
import type { Traffic, TrafficCar } from './city-traffic.js'
import type { VirtualLight } from './light-pool.js'
import { qualityBudgets } from './b3d-quality.js'

/** A street light, as the city keeps it: where it is and whether it flickers. */
export interface SoundingLamp extends VirtualLight {
  /** Non-zero: a failing lamp. */
  seed: number
}

/** The nearest `n` of `items` to `p` (by `at`), within `reach`. */
function nearest<T>(
  items: Iterable<T>,
  at: (t: T) => BABYLON.Vector3,
  p: BABYLON.Vector3,
  n: number,
  reach: number
): T[] {
  const out: { t: T; d: number }[] = []
  for (const t of items) {
    const d = BABYLON.Vector3.DistanceSquared(at(t), p)
    if (d > reach * reach) continue
    out.push({ t, d })
  }
  out.sort((a, b) => a.d - b.d)
  return out.slice(0, n).map((x) => x.t)
}

export class CitySound {
  private engines = new Map<TrafficCar, Voice>()
  private hums = new Map<SoundingLamp, Voice>()
  private horns: { voice: Voice; until: number }[] = []
  private clock = 0

  /** Call every frame. `origin` is the city root's position (traffic is in the city's frame). */
  update(
    scene: BABYLON.Scene,
    dt: number,
    traffic: Traffic | null,
    lamps: SoundingLamp[],
    origin: BABYLON.Vector3
  ) {
    this.clock += dt
    const camera = scene.activeCamera
    if (camera == null) return
    placeListener(camera)
    const ear = camera.globalPosition
    // A share of the device's voices: about half to engines, a quarter to lamps.
    const voices = Math.max(4, qualityBudgets().effectVoices)
    const engineCount = Math.max(2, Math.floor(voices / 2))
    const humCount = Math.max(1, Math.floor(voices / 4))

    // ENGINES: the nearest cars, their note rising with speed, louder on the throttle.
    if (traffic) {
      const at = (c: TrafficCar) =>
        new BABYLON.Vector3(
          c.x + origin.x,
          c.y + origin.y + 0.6,
          c.z + origin.z
        )
      const near = new Set(nearest(traffic.cars, at, ear, engineCount, 70))
      for (const [car, voice] of this.engines) {
        if (!near.has(car)) {
          voice.stop()
          this.engines.delete(car)
        }
      }
      for (const car of near) {
        let voice = this.engines.get(car)
        if (voice == null) {
          const v = startVoice('engine', { refDistance: 6 })
          if (v == null) continue
          voice = v
          this.engines.set(car, voice)
        }
        const b = car.body
        const speed = b ? Math.hypot(b.velocity.x, b.velocity.z) : car.speed
        const pull = Math.max(0, car.throttle)
        voice.place(at(car))
        voice.set(
          0.18 + 0.3 * pull,
          0.8 + speed / 9 + pull * 0.25,
          0.25 + 0.6 * pull,
          16000
        )
      }
      // HORNS: a beep, or two.
      for (const car of traffic.cars) {
        if (!car.honk || this.horns.length >= 3) continue
        const voice = startVoice('horn', { refDistance: 12 })
        if (voice == null) continue
        voice.place(at(car))
        voice.set(0.55, 1, 0.6, 16000)
        // Some drivers give a second beep.
        const long =
          (car.cx * 7 + car.cz * 13 + Math.floor(this.clock)) % 3 === 0
        this.horns.push({ voice, until: this.clock + (long ? 0.75 : 0.32) })
      }
    }
    this.horns = this.horns.filter((h) => {
      if (this.clock < h.until) return true
      h.voice.stop()
      return false
    })

    // STREET LIGHTS: the lit ones nearest you hum; a failing one sputters with its flicker.
    const lit = lamps.filter((l) => l.level > 0.05)
    const near = new Set(nearest(lit, (l) => l.position, ear, humCount, 25))
    for (const [lamp, voice] of this.hums) {
      if (!near.has(lamp)) {
        voice.stop()
        this.hums.delete(lamp)
      }
    }
    for (const lamp of near) {
      let voice = this.hums.get(lamp)
      if (voice == null) {
        const v = startVoice(lamp.seed ? 'buzz' : 'hum', { refDistance: 2.5 })
        if (v == null) continue
        voice = v
        this.hums.set(lamp, voice)
      }
      voice.place(lamp.position)
      if (lamp.seed) {
        // The arc catches and drops with the light: loudest as it fails.
        const f = lamp.flicker ?? 1
        voice.set(
          lamp.level * (0.12 + 0.5 * (1 - f)),
          1,
          0.3 + 0.5 * (1 - f),
          16000
        )
      } else voice.set(lamp.level * 0.08, 1, 0.4, 16000)
    }
  }

  dispose() {
    for (const v of this.engines.values()) v.stop()
    for (const v of this.hums.values()) v.stop()
    for (const h of this.horns) h.voice.stop()
    this.engines.clear()
    this.hums.clear()
    this.horns = []
  }
}
