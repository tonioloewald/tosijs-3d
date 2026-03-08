/*#
# b3d-sound

Declarative audio component wrapping Babylon.js `Sound`. Supports both
2D (ambient/music) and 3D (positional/spatial) audio. Spatial sounds
can be placed at a fixed position or attached to a mesh to follow it.

Note: browsers block audio autoplay before user interaction. If `autoplay`
is set, the sound will attempt to play on connect, but may be silenced
until the user interacts with the page.

## Demo

```js
const { b3d, b3dSound, b3dLight, b3dSkybox, b3dSphere, b3dGround } = tosijs3d
const { elements } = tosijs
const { div, button, p } = elements

const spatialSound = b3dSound({
  url: './static/hum.wav',
  spatialSound: true,
  x: 4, y: 1, z: 0,
  loop: true,
  volume: 0.8,
  refDistance: 2,
  maxDistance: 20,
})

preview.append(
  b3d(
    {
      sceneCreated(el, BABYLON) {
        const camera = new BABYLON.ArcRotateCamera(
          'cam', -Math.PI / 2, Math.PI / 3, 12,
          BABYLON.Vector3.Zero(), el.scene
        )
        camera.attachControl(el.querySelector('canvas'), true)
        el.setActiveCamera(camera)
      },
    },
    b3dLight({ y: 1, intensity: 0.8 }),
    b3dSkybox({ timeOfDay: 12 }),
    b3dGround({ diameter: 20, color: '#556644' }),
    b3dSphere({ x: 4, y: 1, z: 0, diameter: 0.5, color: '#ff4400' }),
    spatialSound,
  ),
  div(
    { style: 'position:absolute; top:8px; right:8px; background:rgba(0,0,0,0.6); color:white; padding:8px 12px; border-radius:6px; font:12px monospace' },
    p('Orbit the camera to hear spatial panning'),
    button({ textContent: 'Play', onclick() { spatialSound.play() } }),
    button({ textContent: 'Stop', onclick() { spatialSound.stop() } }),
  ),
)
```

## Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `url` | `''` | Audio file URL |
| `volume` | `1` | Volume (0-1) |
| `loop` | `false` | Loop playback |
| `autoplay` | `false` | Auto-start on connect |
| `spatialSound` | `false` | Enable 3D positional audio |
| `x` | `0` | Position X (spatial mode) |
| `y` | `0` | Position Y (spatial mode) |
| `z` | `0` | Position Z (spatial mode) |
| `refDistance` | `1` | Distance at full volume |
| `rolloffFactor` | `1` | Attenuation rate |
| `maxDistance` | `100` | Cutoff distance |
| `distanceModel` | `'linear'` | `'linear'`, `'inverse'`, `'exponential'` |
| `attachTo` | `''` | Mesh name to follow |
| `playbackRate` | `1` | Playback speed |
*/

import { Component } from 'tosijs'
import * as BABYLON from '@babylonjs/core'
import { findB3dOwner } from './b3d-utils'
import type { B3d } from './tosi-b3d'

export class B3dSound extends Component {
  static styleSpec = {
    ':host': {
      display: 'none',
    },
  }

  static initAttributes = {
    url: '',
    volume: 1,
    loop: false,
    autoplay: false,
    spatialSound: false,
    x: 0,
    y: 0,
    z: 0,
    refDistance: 1,
    rolloffFactor: 1,
    maxDistance: 100,
    distanceModel: 'linear',
    attachTo: '',
    playbackRate: 1,
  }

  declare url: string
  declare volume: number
  declare loop: boolean
  declare autoplay: boolean
  declare spatialSound: boolean
  declare x: number
  declare y: number
  declare z: number
  declare refDistance: number
  declare rolloffFactor: number
  declare maxDistance: number
  declare distanceModel: string
  declare attachTo: string
  declare playbackRate: number

  owner: B3d | null = null
  sound: BABYLON.Sound | null = null

  content = () => ''

  connectedCallback() {
    super.connectedCallback()
    this.owner = findB3dOwner(this)
    if (this.owner == null) return

    const attrs = this as any
    if (!attrs.url) return

    this.sound = new BABYLON.Sound(
      'sound',
      attrs.url,
      this.owner.scene,
      () => {
        this.dispatchEvent(
          new CustomEvent('loaded', { bubbles: true })
        )
        // Attach to mesh after loading if specified
        if (attrs.attachTo && attrs.spatialSound && this.sound) {
          const mesh = this.owner?.scene.getMeshByName(attrs.attachTo)
          if (mesh) {
            this.sound.attachToMesh(mesh)
          }
        }
      },
      {
        loop: attrs.loop,
        autoplay: attrs.autoplay,
        volume: attrs.volume,
        spatialSound: attrs.spatialSound,
        distanceModel: attrs.distanceModel,
        refDistance: attrs.refDistance,
        rolloffFactor: attrs.rolloffFactor,
        maxDistance: attrs.maxDistance,
      }
    )

    // Set initial position for spatial sounds not attached to a mesh
    if (attrs.spatialSound && !attrs.attachTo) {
      this.sound.setPosition(new BABYLON.Vector3(attrs.x, attrs.y, attrs.z))
    }
  }

  disconnectedCallback() {
    if (this.sound) {
      this.sound.dispose()
      this.sound = null
    }
    this.owner = null
    super.disconnectedCallback()
  }

  render() {
    super.render()
    if (!this.sound) return
    const attrs = this as any
    this.sound.setVolume(attrs.volume)
    this.sound.setPlaybackRate(attrs.playbackRate)
    if (attrs.spatialSound && !attrs.attachTo) {
      this.sound.setPosition(new BABYLON.Vector3(attrs.x, attrs.y, attrs.z))
    }
  }

  /** Start playback */
  play() {
    this.sound?.play()
  }

  /** Stop playback */
  stop() {
    this.sound?.stop()
  }

  /** Pause playback */
  pause() {
    this.sound?.pause()
  }

  /** Whether the sound is currently playing */
  get isPlaying(): boolean {
    return this.sound?.isPlaying ?? false
  }
}

export const b3dSound = B3dSound.elementCreator({
  tag: 'tosi-b3d-sound',
})
