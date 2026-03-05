import { tosi, elements } from 'tosijs'
import {
  b3d,
  b3dSun,
  b3dSkybox,
  b3dSphere,
  b3dLoader,
  b3dBiped,
  b3dButton,
  b3dLight,
  b3dWater,
  b3dReflections,
  b3dCollisions,
  gameController,
} from '../src/index'

const { div, label, input, span } = elements

// Fetch package info for header
const response = await fetch('./package.json')
const data = await response.json()
document.title = data.name
const header = document.querySelector('header')!
const h1 = document.createElement('h1')
h1.textContent = data.name
const links = document.createElement('div')
links.innerHTML = `<a href="${data.repository.url}">repo</a> | <a href="https://www.npmjs.com/package/${data.name}">npm</a>`
header.append(h1, links)

// Demo state
const { demo } = tosi({
  demo: {
    showColliders: false,
    time: 19,
  },
})

const scene = './static/test-2.glb'
const omnidude = './static/omnidude.glb'

const preview = document.querySelector('.preview')!
preview.append(
  b3d(
    { glowLayerIntensity: 1 },
    b3dSun({
      shadowCascading: true,
      shadowTextureSize: 2048,
      activeDistance: 20,
    }),
    b3dSkybox({
      timeOfDay: demo.time,
      realtimeScale: 100,
      latitude: 30,
      moonIntensity: 1.5,
    }),
    b3dSphere({
      meshName: 'ref-sphere',
      diameter: 1,
      y: 1,
      x: -3,
      z: -3,
      color: '#aaaaaa',
    }),
    b3dSphere({
      meshName: 'tiny-sphere',
      diameter: 0.25,
      y: 0.125,
      x: 2,
    }),
    b3dSphere({
      meshName: 'chrome-sphere',
      mirror: true,
      diameter: 0.5,
      y: 0.25,
      x: 1.5,
      color: '#ffffff',
    }),
    b3dLoader({ url: scene }),
    gameController(
      b3dBiped({
        url: omnidude,
        x: 5,
        ry: 135,
        player: true,
        cameraType: 'follow',
        initialState: 'look',
      })
    ),
    b3dBiped({ url: omnidude, x: 3, initialState: 'dance' }),
    b3dButton({
      caption: 'Toggle XR',
      x: -2,
      y: 1.5,
      action: () => {
        const biped = document.querySelector('tosi-b3d-biped[player]') as any
        if (biped) {
          if (biped.cameraType !== 'xr') {
            biped.cameraType = 'xr'
          } else {
            window.location.reload()
          }
        }
      },
    }),
    b3dLight({ y: 1, z: 0.5, intensity: 0.2, diffuse: '#8080ff' }),
    b3dWater({ y: -0.2, twoSided: true, waterSize: 1024 }),
    b3dReflections(),
    b3dCollisions({ debug: demo.showColliders })
  )
)

// Sync realtime sky changes back to slider
setInterval(() => {
  const skybox = document.querySelector('tosi-b3d-skybox') as any
  if (skybox) demo.time.value = skybox.timeOfDay
}, 1000)

const formatTime = (v: number) => {
  const h = Math.floor(v)
  const m = Math.round((v % 1) * 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

document.body.append(
  div(
    { id: 'debug-overlay' },
    label(
      input({ type: 'checkbox', bindValue: demo.showColliders }),
      ' show colliders'
    ),
    label(
      'time ',
      input({
        type: 'range',
        min: 0,
        max: 24,
        step: 0.1,
        bindValue: demo.time,
      }),
      ' ',
      span({
        bind: {
          value: demo.time,
          binding: (el: HTMLElement, v: number) => {
            el.textContent = formatTime(v)
          },
        },
      })
    )
  )
)
