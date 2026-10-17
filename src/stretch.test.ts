import { describe, test, expect, beforeAll } from 'bun:test'
import * as BABYLON from '@babylonjs/core'

let apply: (this: any) => void

beforeAll(async () => {
  const { Window } = await import('happy-dom')
  const win = new Window() as any
  const g = globalThis as any
  g.window ??= win
  for (const k of Object.getOwnPropertyNames(win)) {
    try {
      g[k] ??= win[k]
    } catch {
      /* off-document getters */
    }
  }
  const { AbstractMesh } = await import('./b3d-utils.js')
  apply = (AbstractMesh.prototype as any).applyUniformScale
})

// What a destroyable's render() does with its scale attributes, on a bare node.
describe('scale and stretch on a library node (#105)', () => {
  const scene = () => new BABYLON.Scene(new BABYLON.NullEngine())
  const axes = (n: BABYLON.TransformNode) => [
    n.scaling.x,
    n.scaling.y,
    n.scaling.z,
  ]

  test('a stretch set before the node exists is applied when it arrives, times scale', () => {
    const el: any = { scale: 2, stretch: '2 1 3', mesh: undefined }
    apply.call(el) // no node yet: nothing to do, nothing lost
    el.mesh = new BABYLON.TransformNode('piece', scene())
    apply.call(el)
    expect(axes(el.mesh)).toEqual([4, 2, 6])
  })

  test('a hand-set scaling survives renders until scale or stretch changes', () => {
    const el: any = {
      scale: 1,
      stretch: '',
      mesh: new BABYLON.TransformNode('p', scene()),
    }
    apply.call(el)
    expect(axes(el.mesh)).toEqual([1, 1, 1])
    el.mesh.scaling.set(2, 1, 3)
    apply.call(el)
    expect(axes(el.mesh)).toEqual([2, 1, 3])
    el.stretch = '1 5'
    apply.call(el)
    expect(axes(el.mesh)).toEqual([1, 5, 1])
  })
})
