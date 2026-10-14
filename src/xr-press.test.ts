/*
What `pressWithEitherHand` (tosi-b3d.ts) relies on in Babylon, pinned without a
headset.

It reads Babylon's PRIVATE per-controller pointer state to deliver a press that
Babylon would drop (a press on the controller that is not pointing only switches
to it). A rename in a Babylon upgrade would not throw: the workaround would
quietly do nothing and the dropped press would come back. These fail instead,
and the message says which way to go:

- a name we read is gone → update the workaround, or look for a public API;
- Babylon no longer drops the press → the workaround can go.

They read Babylon's own code (`Function.prototype.toString`), which is crude,
but it is the only thing that sees a private rename before a player does.
*/
import { describe, expect, test } from 'bun:test'
import * as BABYLON from '@babylonjs/core'

const proto = (BABYLON as any).WebXRControllerPointerSelection.prototype
const src = (name: string): string => {
  const fn = proto[name]
  if (typeof fn !== 'function') {
    throw new Error(
      `Babylon's WebXRControllerPointerSelection has no ${name}: pressWithEitherHand in tosi-b3d.ts reads it. Update it, or look for a public API.`
    )
  }
  return fn.toString()
}

describe('Babylon XR pointer selection: what pressWithEitherHand relies on', () => {
  test('switching the pointing controller is a public method', () => {
    expect(typeof proto.setAttachedController).toBe('function')
  })

  test('the private state it reads still has the names it reads', () => {
    const frame = src('_onXRFrame')
    // Which controller points, and each controller's state by id.
    expect(frame).toContain('this._attachedController')
    expect(frame).toContain('this._controllers')
    // A controller's current pick, which the delivered press goes to.
    expect(frame).toContain('controllerData.pick')
    const tracked = src('_attachTrackedPointerRayMode')
    // Set on a press so Babylon's own release pairs with it.
    expect(tracked).toContain('controllerData.pointerDownTriggered =')
  })

  test('Babylon still drops a press on the controller that is not pointing (else the workaround can go)', () => {
    // Only the attached controller (or every one, when all are enabled) may
    // press; any other gets nothing. If this stops matching, re-check whether
    // the drop is fixed upstream, and remove pressWithEitherHand if it is.
    expect(src('_attachTrackedPointerRayMode')).toContain(
      'this._options.enablePointerSelectionOnAllControllers || xrController.uniqueId === this._attachedController'
    )
  })
})
