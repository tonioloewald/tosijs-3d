import { describe, test, expect, beforeAll } from 'bun:test'

/*
DISPOSING A MESH MUST TAKE ITS OWN MATERIAL AND LEAVE EVERYONE ELSE'S ALONE.

`mesh.dispose()` leaves materials behind, so every child that builds one leaked
it on every teardown — including every RE-PARENT, since a move disconnects the
child while the scene deliberately survives. Measured in a live browser before
the fix: re-parenting one scene six times took materials 3 → 15 and textures
3 → 21, meshes correctly flat at 2.

The other half is the danger. A glTF file routinely shares one material across
many meshes, and a disposed material still answers `isReady()` — so getting the
sharing check wrong turns siblings black SILENTLY, which is worse than the leak.
Every test below is about that half.
*/

let U: typeof import('./b3d-utils.js')
let BABYLON: typeof import('@babylonjs/core')
let scene: import('@babylonjs/core').Scene

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
  U = await import('./b3d-utils.js')
  scene = new BABYLON.Scene(new BABYLON.NullEngine())
})

const box = (name: string) =>
  BABYLON.MeshBuilder.CreateBox(name, { size: 1 }, scene)

const has = (mat: import('@babylonjs/core').Material) =>
  scene.materials.includes(mat)

describe('disposeMeshTree', () => {
  test('takes the mesh AND its own material', () => {
    const mesh = box('lonely')
    const mat = new BABYLON.StandardMaterial('own', scene)
    mesh.material = mat
    U.disposeMeshTree(mesh)
    expect(scene.meshes.includes(mesh)).toBe(false)
    expect(has(mat)).toBe(false)
  })

  test('LEAVES a material another mesh is still using', () => {
    // The glTF case. Getting this wrong turns the survivor black, silently.
    const shared = new BABYLON.StandardMaterial('shared', scene)
    const a = box('a')
    const b = box('b')
    a.material = shared
    b.material = shared
    U.disposeMeshTree(a)
    expect(scene.meshes.includes(a)).toBe(false)
    expect(scene.meshes.includes(b)).toBe(true)
    expect(has(shared)).toBe(true)
    U.disposeMeshTree(b)
    // ...and takes it once the last user has gone.
    expect(has(shared)).toBe(false)
  })

  test('follows children, so a loaded model does not leak its parts', () => {
    const root = box('root')
    const child = box('child')
    child.parent = root
    const childMat = new BABYLON.StandardMaterial('child-mat', scene)
    child.material = childMat
    U.disposeMeshTree(root)
    expect(scene.meshes.includes(child)).toBe(false)
    expect(has(childMat)).toBe(false)
  })

  test('handles a multi-material, and the sharing rule still holds', () => {
    const sub = new BABYLON.StandardMaterial('sub', scene)
    const multi = new BABYLON.MultiMaterial('multi', scene)
    multi.subMaterials = [sub]
    const a = box('multi-a')
    a.material = multi
    const b = box('also-uses-sub')
    b.material = sub
    U.disposeMeshTree(a)
    expect(has(multi)).toBe(false)
    // `sub` is still somebody's material, so it stays.
    expect(has(sub)).toBe(true)
    U.disposeMeshTree(b)
    expect(has(sub)).toBe(false)
  })

  test('a mesh with no material at all is fine', () => {
    const mesh = box('bare')
    expect(() => U.disposeMeshTree(mesh)).not.toThrow()
    expect(scene.meshes.includes(mesh)).toBe(false)
  })
})

describe('disposeMeshTree and textures', () => {
  const texture = (name: string) =>
    new BABYLON.Texture(
      null,
      scene,
      undefined,
      undefined,
      undefined,
      null,
      null,
      name
    )

  test('takes a texture nothing else refers to', () => {
    const mesh = box('textured')
    const mat = new BABYLON.StandardMaterial('tex-own', scene)
    const tex = texture('own-tex')
    mat.diffuseTexture = tex
    mesh.material = mat
    U.disposeMeshTree(mesh)
    expect(scene.textures.includes(tex)).toBe(false)
  })

  test('LEAVES a texture another material refers to', () => {
    const shared = texture('shared-tex')
    const going = new BABYLON.StandardMaterial('going', scene)
    going.diffuseTexture = shared
    const staying = new BABYLON.StandardMaterial('staying', scene)
    staying.diffuseTexture = shared
    const mesh = box('going-mesh')
    mesh.material = going
    // `staying` needs a live mesh, or it is not "still in the scene" either.
    const keeper = box('keeper')
    keeper.material = staying

    U.disposeMeshTree(mesh)
    expect(has(going)).toBe(false)
    expect(scene.textures.includes(shared)).toBe(true)
  })

  test('LEAVES a texture a LIBRARY material refers to, though it is not in scene.materials', () => {
    /*
    THE CASE THE FIRST GUARD COULD NOT SEE, measured on /b3d-prop/ with real
    Kenney GLBs: a library-instantiated model's materials belong to the
    `AssetContainer`, so they are NOT in `scene.materials` — while its meshes
    ARE in `scene.meshes`. `scene.removeMaterial` reproduces exactly that.

    A guard written against `scene.materials` therefore finds no user for the
    shared texture and disposes it while the library model is still drawing it.
    Silently: the model just goes black. So the texture guard has to ask the
    MESH list, which is the only list that sees both kinds.
    */
    const shared = texture('library-shared-tex')
    const going = new BABYLON.StandardMaterial('going-lib', scene)
    going.diffuseTexture = shared
    const fromContainer = new BABYLON.StandardMaterial('container-mat', scene)
    fromContainer.diffuseTexture = shared
    scene.removeMaterial(fromContainer)
    expect(scene.materials.includes(fromContainer)).toBe(false)

    const mesh = box('going-lib-mesh')
    mesh.material = going
    const libMesh = box('library-mesh')
    libMesh.material = fromContainer

    U.disposeMeshTree(mesh)
    expect(has(going)).toBe(false)
    expect(scene.textures.includes(shared)).toBe(true)

    libMesh.dispose()
    fromContainer.dispose()
  })

  test('LEAVES the scene environment texture', () => {
    /*
    The first of three things that hold a texture without any material naming
    it. Left alone because the reference check would otherwise find no user and
    dispose the scene's lighting out from under it.
    */
    const env = texture('env')
    scene.environmentTexture = env
    const mesh = box('env-user')
    const mat = new BABYLON.StandardMaterial('env-mat', scene)
    mat.diffuseTexture = env
    mesh.material = mat
    U.disposeMeshTree(mesh)
    expect(scene.textures.includes(env)).toBe(true)
    scene.environmentTexture = null
  })

  test("LEAVES a light's projection texture — a lamp's gel", () => {
    const gel = texture('gel')
    const spot = new BABYLON.SpotLight(
      'spot',
      BABYLON.Vector3.Zero(),
      new BABYLON.Vector3(0, -1, 0),
      1,
      2,
      scene
    )
    spot.projectionTexture = gel
    const mesh = box('gel-user')
    const mat = new BABYLON.StandardMaterial('gel-mat', scene)
    mat.diffuseTexture = gel
    mesh.material = mat
    U.disposeMeshTree(mesh)
    expect(scene.textures.includes(gel)).toBe(true)
    spot.dispose()
  })
})

describe('destroyableAt — resolving a hit by ANCESTRY', () => {
  /*
  A library model instantiates ASYNCHRONOUSLY beneath a root, so a shell hits a
  WING and the registered node is the root several levels up. Matching on the
  picked mesh alone found nothing and every shot missed — silently. That is the
  trap manta-recon spent a debugging cycle on (#23), and the reason this walks
  UP rather than snapshotting descendants: the descendants arrive late, so a
  registry built at registration time captures an empty root forever.
  */
  let DB: typeof import('./destroyable-behavior.js')
  let owner: any

  beforeAll(async () => {
    DB = await import('./destroyable-behavior.js')
    const { CombatWorld } = await import('./destroyable.js')
    owner = { scene, combat: new CombatWorld() }
  })

  /*
  `attach()` is what registers it, and constructing alone is not enough — which
  is a real footgun rather than a test detail: `b3d-aircraft` was written
  without it while this was being built, and the result is an invulnerable
  aircraft every blast ignores.
  */
  const attach = (root: import('@babylonjs/core').AbstractMesh, id: string) => {
    const b = new DB.DestroyableBehavior(
      owner,
      {
        get mesh() {
          return root as never
        },
        dispatchEvent: () => true,
      },
      { idBase: id, capacity: 100 },
      {}
    )
    b.attach()
    return b
  }

  test('a hit on a DESCENDANT resolves to the registered root', () => {
    const root = BABYLON.MeshBuilder.CreateBox('craft', { size: 1 }, scene)
    const fuselage = BABYLON.MeshBuilder.CreateBox(
      'fuselage',
      { size: 1 },
      scene
    )
    const wing = BABYLON.MeshBuilder.CreateBox('wing', { size: 1 }, scene)
    fuselage.parent = root
    wing.parent = fuselage // three levels down, as a real model is
    const behavior = attach(root, 'craft')

    expect(DB.destroyableAt(wing)).toBe(behavior)
    expect(DB.destroyableAt(fuselage)).toBe(behavior)
    expect(DB.destroyableAt(root)).toBe(behavior)

    behavior.dispose()
    root.dispose()
  })

  test('a mesh belonging to nothing resolves to null, not to the nearest', () => {
    const root = BABYLON.MeshBuilder.CreateBox('craft2', { size: 1 }, scene)
    const behavior = attach(root, 'craft2')
    const bystander = BABYLON.MeshBuilder.CreateBox('rock', { size: 1 }, scene)
    expect(DB.destroyableAt(bystander)).toBeNull()
    behavior.dispose()
    root.dispose()
    bystander.dispose()
  })

  test('works for a child added AFTER the behaviour attached', () => {
    // The whole reason it walks up: a library model lands late, and a snapshot
    // taken at attach time would never see it.
    const root = BABYLON.MeshBuilder.CreateBox('craft3', { size: 1 }, scene)
    const behavior = attach(root, 'craft3')
    const late = BABYLON.MeshBuilder.CreateBox('late-wing', { size: 1 }, scene)
    late.parent = root
    expect(DB.destroyableAt(late)).toBe(behavior)
    behavior.dispose()
    root.dispose()
  })

  test('a disposed behaviour stops claiming its meshes', () => {
    const root = BABYLON.MeshBuilder.CreateBox('craft4', { size: 1 }, scene)
    const behavior = attach(root, 'craft4')
    expect(DB.destroyableAt(root)).toBe(behavior)
    behavior.dispose()
    expect(DB.destroyableAt(root)).toBeNull()
    root.dispose()
  })

  test('liveDestroyables lists everything attached, whatever element attached it', () => {
    // The registry is the behaviour's own, so `b3d-loader` and `b3d-aircraft`
    // are targets by construction — they used to be invisible to every blast,
    // which queried one tag name.
    const a = BABYLON.MeshBuilder.CreateBox('a-craft', { size: 1 }, scene)
    const b = BABYLON.MeshBuilder.CreateBox('b-craft', { size: 1 }, scene)
    const ba = attach(a, 'a')
    const bb = attach(b, 'b')
    const ids = DB.liveDestroyables(scene).map((e) => e.behavior.combatId)
    expect(ids).toContain(ba.combatId)
    expect(ids).toContain(bb.combatId)
    ba.dispose()
    bb.dispose()
    a.dispose()
    b.dispose()
  })
})
