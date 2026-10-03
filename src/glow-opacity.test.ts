import { describe, test, expect, beforeAll } from 'bun:test'

/*
GLOW FOLLOWS OPACITY (board #2742).

Babylon's glow layer picks a mesh's emissive colour without reading
`mesh.visibility`, and passes `material.alpha` through without weighting the
colour by it. A full-screen emissive curtain fading in at alpha 0.3 therefore
bloomed at FULL strength: manta-recon's orbit title screen went white.
`opacityWeightedGlow` scales the colour by alpha × visibility, and this pins
both halves: a visible, opaque mesh is unchanged; a faint one glows faintly.
*/

let BABYLON: typeof import('@babylonjs/core')
let scene: import('@babylonjs/core').Scene
let opacityWeightedGlow: typeof import('./frame-panel.js').opacityWeightedGlow

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
  BABYLON = await import('@babylonjs/core')
  ;({ opacityWeightedGlow } = await import('./frame-panel.js'))
  const engine = new BABYLON.NullEngine()
  scene = new BABYLON.Scene(engine)
  scene.activeCamera = new BABYLON.FreeCamera(
    'cam',
    new BABYLON.Vector3(0, 0, -10),
    scene
  )
})

function glowOf(alpha: number, visibility: number, intensity?: number) {
  const layer = new BABYLON.GlowLayer('g', scene)
  opacityWeightedGlow(layer)
  const mesh = BABYLON.MeshBuilder.CreatePlane('p', { size: 1 }, scene)
  const mat = new BABYLON.StandardMaterial('m', scene)
  mat.emissiveColor = new BABYLON.Color3(1, 0.5, 0.25)
  mat.alpha = alpha
  if (intensity != null) (mat as any).emissiveIntensity = intensity
  mesh.material = mat
  mesh.visibility = visibility
  const out = new BABYLON.Color4()
  layer.customEmissiveColorSelector!(mesh, mesh.subMeshes[0], mat, out)
  layer.dispose()
  mesh.dispose()
  mat.dispose()
  return out
}

describe('opacityWeightedGlow', () => {
  test('an opaque, visible mesh glows exactly as Babylon would', () => {
    const c = glowOf(1, 1)
    expect([c.r, c.g, c.b, c.a]).toEqual([1, 0.5, 0.25, 1])
  })

  test('a 30% curtain glows at 30%, not at full strength', () => {
    const c = glowOf(0.3, 1)
    expect(c.r).toBeCloseTo(0.3)
    expect(c.g).toBeCloseTo(0.15)
    expect(c.a).toBeCloseTo(0.3)
  })

  test('visibility = 0 means no glow (the old excludeFromGlow trap)', () => {
    const c = glowOf(1, 0)
    expect([c.r, c.g, c.b]).toEqual([0, 0, 0])
  })

  test('emissiveIntensity is still honoured', () => {
    expect(glowOf(1, 1, 2).r).toBeCloseTo(2)
  })
})
