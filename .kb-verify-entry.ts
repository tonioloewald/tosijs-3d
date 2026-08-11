import {
  Engine,
  Scene,
  ArcRotateCamera,
  HemisphericLight,
  DirectionalLight,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Vector3,
  VertexData,
} from '@babylonjs/core'
import { attachBiomePlugin } from './src/biome-plugin'

const canvas = document.createElement('canvas')
canvas.width = 640
canvas.height = 460
document.body.append(canvas)
const engine = new Engine(canvas, true)
const scene = new Scene(engine)
scene.clearColor.set(0.05, 0.07, 0.12, 1)
new ArcRotateCamera(
  'c',
  -Math.PI / 2.35,
  Math.PI / 3.3,
  300,
  new Vector3(0, 10, 0),
  scene
)
new HemisphericLight('h', new Vector3(0, 1, 0), scene).intensity = 0.5
const sun = new DirectionalLight('d', new Vector3(-0.6, -0.5, 0.4), scene)
sun.intensity = 0.9

// Plateaus + rolling relief through sea level: quantized coarse field with
// smoothed risers, plus fine detail.
const ground = MeshBuilder.CreateGround(
  'g',
  { width: 480, height: 480, subdivisions: 220, updatable: true },
  scene
)
const pos = ground.getVerticesData('position')!
const plateau = (h: number) => {
  const steps = 4
  const t = (h + 60) / 120
  const q = Math.floor(t * steps) / steps
  const f = t * steps - Math.floor(t * steps)
  const riser = Math.min(1, Math.max(0, (f - 0.7) / 0.3))
  return (q + riser / steps) * 120 - 60
}
for (let i = 0; i < pos.length; i += 3) {
  const x = pos[i],
    z = pos[i + 2]
  const coarse =
    34 * Math.sin(x * 0.011 + 0.8) +
    26 * Math.sin(z * 0.014 + 2.1) +
    18 * Math.sin((x + z) * 0.007)
  pos[i + 1] =
    plateau(coarse) + 2.5 * Math.sin(x * 0.09) * Math.sin(z * 0.075) - 6
}
ground.updateVerticesData('position', pos)
const normals: number[] = []
VertexData.ComputeNormals(pos, ground.getIndices(), normals)
ground.updateVerticesData('normal', normals)
const mat = new StandardMaterial('m', scene)
mat.specularColor.set(0, 0, 0)
ground.material = mat
attachBiomePlugin(mat, { lapseRate: 0.011, mapMoisture: 0.85 })

// water plane at y=0 for the shoreline read
const water = MeshBuilder.CreateGround('w', { width: 480, height: 480 }, scene)
const wmat = new StandardMaterial('wm', scene)
wmat.diffuseColor = new Color3(0.1, 0.25, 0.35)
wmat.alpha = 0.55
wmat.specularColor.set(0.2, 0.2, 0.2)
water.material = wmat
engine.runRenderLoop(() => scene.render())
