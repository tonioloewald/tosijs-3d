import { describe, test, expect } from 'bun:test'
import * as BABYLON from '@babylonjs/core'
import { createHandles } from './manipulator-view.js'

const handles = () => {
  const scene = new BABYLON.Scene(new BABYLON.NullEngine())
  const view = createHandles(scene)
  view.setTransforms({ translate: true, rotate: false, scale: false })
  view.moveTo({ x: 0, y: 0, z: 0 })
  view.setScale(1)
  for (const m of scene.meshes) m.computeWorldMatrix(true)
  return view
}
const toward = (from: number[], to: number[]) => {
  const d = to.map((v, i) => v - from[i])
  const n = Math.hypot(...d)
  return {
    origin: { x: from[0], y: from[1], z: from[2] },
    direction: { x: d[0] / n, y: d[1] / n, z: d[2] / n },
  }
}

describe('picking a handle', () => {
  test('a plane pad wins over a shaft drawn in front of it', () => {
    // The y pad (the XZ plane) sits on the −x spoke; this ray crosses the
    // y shaft at y = 0.2 on its way to the pad's middle.
    const grip = handles().gripAt(toward([0.2, 0.4, 0], [-0.2, 0, 0]))
    expect(grip).toEqual({ kind: 'planar', axis: 'y' })
  })

  test('aiming at the shaft alone still moves along its axis', () => {
    const grip = handles().gripAt(toward([1, 0.35, 0], [0, 0.35, 0]))
    expect(grip).toEqual({ kind: 'translate', axis: 'y' })
  })
})

describe('a locked axis', () => {
  test("locking x draws the y and z arrows and only the pad between them", () => {
    const scene = new BABYLON.Scene(new BABYLON.NullEngine())
    const view = createHandles(scene)
    view.setTransforms({ translate: true, rotate: false, scale: false, lockMove: 'x' })
    const drawn = new Set(
      scene.meshes.filter((m) => !m.name.endsWith('-pick')).map((m) => m.name.replace(/^.*handle-/, '').replace(/-(shaft|head)$/, ''))
    )
    expect([...drawn].sort()).toEqual(['planar-x', 'translate-y', 'translate-z'])
  })
})
