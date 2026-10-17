import { describe, test, expect } from 'bun:test'
import * as BABYLON from '@babylonjs/core'
import { ProjectedAoController } from './b3d-ssao-projected.js'

const params = {
  active: true,
  strength: 1,
  radius: 2,
  samples: 8,
  ratio: 0.5,
  rate: 0,
}

describe('projected AO reaches every drawn material (tosijs-3d#107)', () => {
  test("a library's container material, outside scene.materials, gets the hook", async () => {
    const engine = new BABYLON.NullEngine()
    const scene = new BABYLON.Scene(engine)
    new BABYLON.FreeCamera('cam', new BABYLON.Vector3(0, 2, -6), scene)
    // As a library does: the material lives in a container, not the scene,
    // and was announced before AO was on.
    const container = new BABYLON.AssetContainer(scene)
    const shared = new BABYLON.StandardMaterial('kit', scene)
    scene.removeMaterial(shared)
    container.materials.push(shared)
    expect(scene.materials.includes(shared)).toBe(false)

    const early = BABYLON.MeshBuilder.CreateBox('early', {}, scene)
    early.material = shared
    const ao = new ProjectedAoController(scene)
    ao.update(params)
    scene.render()
    const hooked = (m: BABYLON.Material) =>
      (m.pluginManager?.getPlugin('ProjectedAo') as any)?.isEnabled === true
    expect(hooked(shared)).toBe(true)

    // A piece placed after AO is running, with its own container material.
    const late = new BABYLON.StandardMaterial('kit-late', scene)
    scene.removeMaterial(late)
    await new Promise((r) => setTimeout(r, 0))
    const piece = BABYLON.MeshBuilder.CreateBox('late', {}, scene)
    piece.material = late
    await new Promise((r) => setTimeout(r, 0))
    expect(hooked(late)).toBe(true)

    ao.dispose()
    expect(hooked(shared)).toBe(false)
    scene.dispose()
    engine.dispose()
  })
})
