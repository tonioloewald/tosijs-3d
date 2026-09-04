import { describe, test, expect } from 'bun:test'
import * as BABYLON from '@babylonjs/core'
import { NullEngine } from '@babylonjs/core/Engines/nullEngine.js'
import { WorldStore } from './world-store.js'
import { WorldView } from './world-view.js'

function makeScene(): BABYLON.Scene {
  return new BABYLON.Scene(new NullEngine())
}

describe('world-view reconciliation', () => {
  test('draws a mesh for the player that exists at construction', () => {
    const view = new WorldView(makeScene(), new WorldStore())
    const player = view.getMesh('player')
    expect(player).toBeDefined()
    expect(player!.position.asArray()).toEqual([0, 0, 0])
    view.dispose()
  })

  test('a spawned entity gets a mesh at its position after reconcile', () => {
    const store = new WorldStore()
    const view = new WorldView(makeScene(), store)

    const npc = store.spawn({ kind: 'npc', position: { x: 5, y: 0.8, z: 5 } })
    expect(view.getMesh(npc)).toBeUndefined() // not synced yet

    view.reconcile()
    expect(view.getMesh(npc)!.position.asArray()).toEqual([5, 0.8, 5])
    view.dispose()
  })

  test('a moved entity repositions its mesh', () => {
    const store = new WorldStore()
    const view = new WorldView(makeScene(), store)

    store.moveEntity('player', { x: 1, y: 0, z: -2 })
    view.reconcile()
    expect(view.getMesh('player')!.position.asArray()).toEqual([1, 0, -2])
    view.dispose()
  })

  test('a forgotten entity has its mesh disposed', () => {
    const store = new WorldStore()
    const view = new WorldView(makeScene(), store)
    const item = store.spawn({ kind: 'item', position: { x: 0, y: 0, z: 0 } })
    view.reconcile()
    const mesh = view.getMesh(item)!
    expect(mesh.isDisposed()).toBe(false)

    store.forget(item)
    view.reconcile()
    expect(view.getMesh(item)).toBeUndefined()
    expect(mesh.isDisposed()).toBe(true)
    view.dispose()
  })

  test('a custom factory overrides the visuals', () => {
    const store = new WorldStore()
    const scene = makeScene()
    const view = new WorldView(scene, store, {
      factory: (entity) => new BABYLON.TransformNode(entity.id, scene) as any,
    })
    expect(view.getMesh('player')).toBeInstanceOf(BABYLON.TransformNode)
    view.dispose()
  })

  test('dispose tears down all meshes', () => {
    const store = new WorldStore()
    const view = new WorldView(makeScene(), store)
    store.spawn({ kind: 'item', position: { x: 0, y: 0, z: 0 } })
    view.reconcile()
    view.dispose()
    expect(view.getMesh('player')).toBeUndefined()
  })
})
