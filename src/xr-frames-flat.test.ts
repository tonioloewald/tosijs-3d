import { describe, expect, test } from 'bun:test'
import * as BABYLON from '@babylonjs/core'
import { XrFrames } from './xr-frames.js'

/*
FLAT FRAMES (tosijs-3d#81): the same frame vocabulary a headset gets, derived
from a flat camera's WORLD pose — for any camera type, since an ArcRotate has
no rotationQuaternion and the XR path's local reads would silently give zero.
*/
const setup = () => {
  const scene = new BABYLON.Scene(new BABYLON.NullEngine())
  const cam = new BABYLON.ArcRotateCamera(
    'orbit',
    -Math.PI / 2 + 0.6, // swung 0.6 rad off facing +Z
    Math.PI / 3, // looking down 30°
    10,
    new BABYLON.Vector3(2, 0, 3),
    scene
  )
  scene.activeCamera = cam
  cam.computeWorldMatrix(true)
  const frames = XrFrames.flat(scene, cam)
  frames.update(0)
  return { scene, cam, frames }
}

describe('XrFrames.flat', () => {
  test('eye sits at the camera, with its yaw and NOT its pitch', () => {
    const { cam, frames } = setup()
    const p = cam.globalPosition
    expect(frames.eye.position.subtract(p).length()).toBeLessThan(1e-6)
    const fwd = cam.getDirection(BABYLON.Axis.Z)
    const eyeFwd = BABYLON.Vector3.TransformNormal(
      BABYLON.Axis.Z,
      frames.eye.computeWorldMatrix(true)
    )
    // Level: no pitch, whatever the camera's.
    expect(Math.abs(eyeFwd.y)).toBeLessThan(1e-6)
    expect(fwd.y).toBeLessThan(-0.3) // the camera really is pitched
    // Same heading.
    expect(Math.atan2(eyeFwd.x, eyeFwd.z)).toBeCloseTo(
      Math.atan2(fwd.x, fwd.z),
      6
    )
  })

  test('body is on the floor under the eye; face rides the camera', () => {
    const { cam, frames } = setup()
    expect(frames.body.position.y).toBeCloseTo(cam.globalPosition.y - 1.6, 6)
    expect(frames.body.position.x).toBeCloseTo(cam.globalPosition.x, 6)
    expect(frames.face.parent).toBe(cam)
  })

  test('the hands stay disabled — a monitor has none', () => {
    const { frames } = setup()
    expect(frames.leftHand.isEnabled()).toBe(false)
    expect(frames.rightHand.isEnabled()).toBe(false)
  })

  test('it follows the camera as it moves, and setCamera follows a switch', () => {
    const { scene, cam, frames } = setup()
    cam.alpha += 1
    cam.computeWorldMatrix(true)
    frames.update(0)
    expect(
      frames.eye.position.subtract(cam.globalPosition).length()
    ).toBeLessThan(1e-6)
    const other = new BABYLON.FreeCamera(
      'free',
      new BABYLON.Vector3(5, 2, 5),
      scene
    )
    frames.setCamera(other)
    frames.update(0)
    expect(frames.face.parent).toBe(other)
    expect(frames.eye.position.asArray()).toEqual([5, 2, 5])
  })

  test('dispose takes the rig it made with it', () => {
    const { frames } = setup()
    const rig = frames.rig
    frames.dispose()
    expect(rig.isDisposed()).toBe(true)
  })
})
