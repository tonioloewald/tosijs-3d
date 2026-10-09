import { describe, expect, test } from 'bun:test'
import * as BABYLON from '@babylonjs/core'
import { registerShoreWater } from './water-shore-shader.js'

// The patch is a set of exact-string replacements in Babylon's (minified)
// water shader. If a Babylon update changes any of those strings, the water
// falls back to plain, with no shoreline and no ice. This is where that shows.
describe('the shore patch against the installed Babylon', () => {
  test('applies, to both shaders, once', () => {
    expect(registerShoreWater()).toBe(true)
    const store = BABYLON.ShaderStore.ShadersStore as Record<string, string>
    expect(store.waterPixelShader).toContain('b3dShoreIce')
    expect(store.waterPixelShader).not.toContain('baseColor.rgb*=vColor.rgb;')
    expect(store.waterVertexShader).toContain('vB3dShore=color.a;')
    const once = store.waterPixelShader
    expect(registerShoreWater()).toBe(true)
    expect(store.waterPixelShader).toBe(once)
  })
})
