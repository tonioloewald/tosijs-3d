import { describe, test, expect, beforeAll } from 'bun:test'

/*
THE DRAG MUST SURVIVE THE EVENT THAT STARTS IT.

`PointerDragBehavior` also listens on POINTERDOWN, and its handler releases any
drag whose `_activeDragButton` does not match the event's button. `startDrag()`
leaves that at -1, so starting the drag from `onPrePointerObservable` — before
Babylon's own pass — meant the behaviour killed it inside the same event: one
dragStart, one dragEnd, zero drags. User-visible as a popup that jumps to front
and then refuses to follow the pointer, i.e. the headline gesture doing nothing.

Nothing caught it because nothing asserted the STATE after a press. This does.
*/

let BABYLON: typeof import('@babylonjs/core')

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
})

/** The exact configuration `popup-surface` uses for a gripped panel. */
const gripDrag = (mesh: any) => {
  const drag = new BABYLON.PointerDragBehavior({
    dragPlaneNormal: new BABYLON.Vector3(0, 0, 1),
  })
  drag.useObjectOrientationForDragging = true
  drag.startAndReleaseDragOnPointerEvents = false
  mesh.addBehavior(drag)
  return drag
}

const makeScene = () => {
  const engine = new BABYLON.NullEngine()
  const scene = new BABYLON.Scene(engine)
  scene.activeCamera = new BABYLON.FreeCamera(
    'c',
    new BABYLON.Vector3(0, 0, -5),
    scene
  )
  const mesh = BABYLON.MeshBuilder.CreatePlane('panel', { size: 1 }, scene)
  mesh.computeWorldMatrix(true)
  return { scene, mesh }
}

/** Fire the POINTERDOWN that Babylon's own behaviour observes. */
const pressDown = (scene: any) =>
  scene.onPointerObservable.notifyObservers(
    new BABYLON.PointerInfo(
      BABYLON.PointerEventTypes.POINTERDOWN,
      { pointerId: 1, button: 0, clientX: 0, clientY: 0 } as any,
      null as any
    )
  )

describe('grip drag survives Babylon own POINTERDOWN pass', () => {
  test('starting BEFORE the pass is killed by it — the bug', () => {
    const { scene, mesh } = makeScene()
    const drag = gripDrag(mesh)
    // Pre-pass ordering: we start, then Babylon's handler runs.
    drag.startDrag(1)
    expect(drag.dragging).toBe(true) // ok so far…
    pressDown(scene)
    expect(drag.dragging).toBe(false) // …and dead inside the same event
  })

  test('starting AFTER the pass survives — the fix', () => {
    const { scene, mesh } = makeScene()
    const drag = gripDrag(mesh)
    // Post-pass ordering, which is what moving to onPointerObservable buys.
    pressDown(scene)
    drag.startDrag(1)
    expect(drag.dragging).toBe(true)
  })

  test('a behaviour registered AFTER us still kills a synchronous start', () => {
    /*
    The ordering trap, and why "run after the behaviour" was the wrong fix.

    `wirePointer` installs ONCE per scene, on the first popup's mount. Every
    later popup's drag behaviour therefore registers its observer AFTER ours —
    so reordering fixed popup 0 and left the rest broken, which is precisely
    what got reported: "I cannot move the pop-ups, none of them."
    */
    const { scene, mesh } = makeScene()
    let started = false
    // Our handler, registered FIRST — the later-popup case.
    scene.onPointerObservable.add((info) => {
      if (info.type !== BABYLON.PointerEventTypes.POINTERDOWN) return
      if (!started) {
        started = true
        drag.startDrag(1)
      }
    })
    const drag = gripDrag(mesh) // behaviour registers AFTER
    pressDown(scene)
    expect(drag.dragging).toBe(false) // killed, as reported
  })

  test('deferring past the EVENT survives whatever the order was', async () => {
    const { scene, mesh } = makeScene()
    let started = false
    scene.onPointerObservable.add((info) => {
      if (info.type !== BABYLON.PointerEventTypes.POINTERDOWN) return
      if (started) return
      started = true
      // What `beginDrag` does now: leave the event entirely.
      queueMicrotask(() => drag.startDrag(1))
    })
    const drag = gripDrag(mesh) // still registers after us
    pressDown(scene)
    await Promise.resolve()
    expect(drag.dragging).toBe(true)
  })

  test('releaseDrag ends it — nothing else will, with startAndRelease off', () => {
    const { scene, mesh } = makeScene()
    const drag = gripDrag(mesh)
    pressDown(scene)
    drag.startDrag(1)
    expect(drag.dragging).toBe(true)
    drag.releaseDrag()
    expect(drag.dragging).toBe(false)
  })
})
