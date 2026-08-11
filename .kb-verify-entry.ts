import {
  Engine,
  Scene,
  ArcRotateCamera,
  HemisphericLight,
  DirectionalLight,
  MeshBuilder,
  StandardMaterial,
  Vector3,
  VertexData,
} from '@babylonjs/core'
import { attachBiomePlugin } from './src/biome-plugin'
const canvas = document.createElement('canvas')
canvas.width = 640
canvas.height = 440
document.body.append(canvas)
const engine = new Engine(canvas, true)
const scene = new Scene(engine)
scene.clearColor.set(0.05, 0.07, 0.12, 1)
new ArcRotateCamera(
  'c',
  -Math.PI / 2.4,
  Math.PI / 3.2,
  240,
  new Vector3(0, 5, 0),
  scene
)
new HemisphericLight('h', new Vector3(0, 1, 0), scene).intensity = 0.5
new DirectionalLight('d', new Vector3(-0.7, -0.5, 0.4), scene).intensity = 0.9
const ground = MeshBuilder.CreateGround(
  'g',
  { width: 400, height: 400, subdivisions: 96, updatable: true },
  scene
)
const pos = ground.getVerticesData('position')!
for (let i = 0; i < pos.length; i += 3) {
  const x = pos[i],
    z = pos[i + 2]
  pos[i + 1] = 55 * Math.sin(x * 0.012) + 14 * Math.sin(z * 0.03 + 1.7) - 8
}
ground.updateVerticesData('position', pos)
const normals: number[] = []
VertexData.ComputeNormals(pos, ground.getIndices(), normals)
ground.updateVerticesData('normal', normals)
const mat = new StandardMaterial('m', scene)
mat.specularColor.set(0, 0, 0)
ground.material = mat
attachBiomePlugin(mat, { mapMoisture: 0.9, detailNoiseAmp: 0.14 })
engine.runRenderLoop(() => scene.render())
