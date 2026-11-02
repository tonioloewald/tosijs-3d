import { describe, expect, test } from 'bun:test'
import * as BABYLON from '@babylonjs/core'
import { skinShading } from './skin-shading.js'
import { registerMaterialPlugin } from './material-plugins.js'

/*
What Babylon does when the LAST engine is disposed. Other test files leave
engines alive in this process, so disposing one here would not fire it.
*/
function lastEngineGone(): void {
  const engine = new BABYLON.NullEngine()
  BABYLON.EngineStore.OnEnginesDisposedObservable.notifyObservers(engine)
  engine.dispose()
}

describe('material plugins', () => {
  test('survive the last engine being disposed', () => {
    lastEngineGone()
    const engine = new BABYLON.NullEngine()
    const skin = new BABYLON.PBRMaterial('skin', new BABYLON.Scene(engine))
    expect(() => skinShading(skin)).not.toThrow()
    engine.dispose()
  })

  test('a plugin registered here is put back after a clear', () => {
    let made = 0
    registerMaterialPlugin('TestCountingPlugin', () => {
      made++
      return null
    })
    lastEngineGone()
    const engine = new BABYLON.NullEngine()
    new BABYLON.StandardMaterial('m', new BABYLON.Scene(engine))
    expect(made).toBeGreaterThan(0)
    engine.dispose()
  })
})
