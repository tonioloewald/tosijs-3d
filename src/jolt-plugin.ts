/**
 * JoltPlugin — Babylon.js IPhysicsEnginePluginV2 implementation using Jolt Physics (MIT).
 *
 * Drop-in replacement for HavokPlugin. Pass the initialized Jolt WASM module to the
 * constructor, then use with `scene.enablePhysics(gravity, new JoltPlugin(jolt))`.
 *
 * Currently implements the subset needed for rigid body simulation:
 * bodies, shapes (box/sphere/capsule/cylinder/convex-hull/mesh), velocity,
 * impulses, gravity, mass, material, damping, and debug geometry.
 *
 * Constraints, raycasting, collision callbacks, instancing, and triggers are
 * stubbed — contributions welcome.
 *
 * @license MIT
 */

import { Observable } from '@babylonjs/core/Misc/observable'
import { Vector3, Quaternion, Matrix } from '@babylonjs/core/Maths/math.vector'
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer'
import { BoundingBox } from '@babylonjs/core/Culling/boundingBox'
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { Mesh } from '@babylonjs/core/Meshes/mesh'
import type { Nullable } from '@babylonjs/core/types'
import type { PhysicsBody } from '@babylonjs/core/Physics/v2/physicsBody'
import type { PhysicsShape } from '@babylonjs/core/Physics/v2/physicsShape'
import type { PhysicsConstraint } from '@babylonjs/core/Physics/v2/physicsConstraint'
import type { PhysicsMaterial } from '@babylonjs/core/Physics/v2/physicsMaterial'
import type { PhysicsRaycastResult } from '@babylonjs/core/Physics/physicsRaycastResult'
import type {
  IPhysicsEnginePluginV2,
  IPhysicsCollisionEvent,
  IBasePhysicsCollisionEvent,
  PhysicsShapeParameters,
  PhysicsMassProperties,
  PhysicsConstraintParameters,
  PhysicsConstraintAxis,
  PhysicsConstraintAxisLimitMode,
  PhysicsConstraintMotorType,
  ConstrainedBodyPair,
} from '@babylonjs/core/Physics/v2/IPhysicsEnginePlugin'
import {
  PhysicsShapeType,
  PhysicsMotionType,
} from '@babylonjs/core/Physics/v2/IPhysicsEnginePlugin'

// ---------------------------------------------------------------------------
// Internal data stored on body._pluginData / shape._pluginData
// ---------------------------------------------------------------------------

interface JoltBodyPluginData {
  joltBody: any
  bodyId: any
  motionType: number
}

interface JoltShapePluginData {
  joltShape: any
  shapeType: number
  density: number
  material: { friction: number; restitution: number; staticFriction: number }
}

// ---------------------------------------------------------------------------
// JoltPlugin
// ---------------------------------------------------------------------------

export class JoltPlugin implements IPhysicsEnginePluginV2 {
  world: any // Jolt.PhysicsSystem
  name = 'JoltPlugin'

  onCollisionObservable: Observable<IPhysicsCollisionEvent>
  onCollisionEndedObservable: Observable<IBasePhysicsCollisionEvent>
  onTriggerCollisionObservable: Observable<IBasePhysicsCollisionEvent>

  private _jolt: any
  private _joltInterface: any
  private _bodyInterface: any
  private _fixedTimeStep = 1 / 60
  private _useDeltaForWorldStep: boolean
  private _bodies = new Map<number, { body: PhysicsBody; index: number }>()

  // Layer constants
  static readonly LAYER_NON_MOVING = 0
  static readonly LAYER_MOVING = 1

  constructor(joltModule: any, useDeltaForWorldStep = true) {
    this._jolt = joltModule
    this._useDeltaForWorldStep = useDeltaForWorldStep

    // Two-layer collision setup: static(0) vs dynamic(1)
    const settings = new joltModule.JoltSettings()
    const objectFilter = new joltModule.ObjectLayerPairFilterTable(2)
    objectFilter.EnableCollision(0, 1) // static vs dynamic
    objectFilter.EnableCollision(1, 1) // dynamic vs dynamic

    const bpLayerNonMoving = new joltModule.BroadPhaseLayer(0)
    const bpLayerMoving = new joltModule.BroadPhaseLayer(1)
    const bpInterface = new joltModule.BroadPhaseLayerInterfaceTable(2, 2)
    bpInterface.MapObjectToBroadPhaseLayer(0, bpLayerNonMoving)
    bpInterface.MapObjectToBroadPhaseLayer(1, bpLayerMoving)

    const bpFilter =
      new joltModule.ObjectVsBroadPhaseLayerFilterTable(
        bpInterface,
        2,
        objectFilter,
        2
      )

    settings.mObjectLayerPairFilter = objectFilter
    settings.mBroadPhaseLayerInterface = bpInterface
    settings.mObjectVsBroadPhaseLayerFilter = bpFilter

    this._joltInterface = new joltModule.JoltInterface(settings)
    this.world = this._joltInterface.GetPhysicsSystem()
    this._bodyInterface = this.world.GetBodyInterface()

    this.onCollisionObservable = new Observable()
    this.onCollisionEndedObservable = new Observable()
    this.onTriggerCollisionObservable = new Observable()
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private _toJoltMotionType(mt: number): any {
    const J = this._jolt
    switch (mt) {
      case PhysicsMotionType.STATIC:
        return J.EMotionType_Static
      case PhysicsMotionType.ANIMATED:
        return J.EMotionType_Kinematic
      case PhysicsMotionType.DYNAMIC:
        return J.EMotionType_Dynamic
      default:
        return J.EMotionType_Dynamic
    }
  }

  private _fromJoltMotionType(jmt: any): number {
    const J = this._jolt
    if (jmt === J.EMotionType_Static) return PhysicsMotionType.STATIC
    if (jmt === J.EMotionType_Kinematic) return PhysicsMotionType.ANIMATED
    return PhysicsMotionType.DYNAMIC
  }

  private _getPluginData(
    body: PhysicsBody,
    instanceIndex?: number
  ): JoltBodyPluginData {
    const b = body as any
    if (b._pluginDataInstances?.length > 0) {
      return b._pluginDataInstances[instanceIndex ?? 0]
    }
    return b._pluginData
  }

  // ── Core lifecycle ──────────────────────────────────────────────────────

  getPluginVersion(): number {
    return 2
  }

  setGravity(gravity: Vector3): void {
    const g = new this._jolt.Vec3(gravity.x, gravity.y, gravity.z)
    this.world.SetGravity(g)
    this._jolt.destroy(g)

    // Wake all dynamic bodies so they respond to the new gravity
    for (const [, { body }] of this._bodies) {
      const pd = this._getPluginData(body)
      if (pd?.bodyId && pd.motionType === PhysicsMotionType.DYNAMIC) {
        this._bodyInterface.ActivateBody(pd.bodyId)
      }
    }
  }

  setTimeStep(timeStep: number): void {
    this._fixedTimeStep = timeStep
  }

  getTimeStep(): number {
    return this._fixedTimeStep
  }

  setVelocityLimits(maxLinear: number, maxAngular: number): void {
    // Jolt sets these per-body; store for future bodies
    this._maxLinearVelocity = maxLinear
    this._maxAngularVelocity = maxAngular
  }
  private _maxLinearVelocity = 500
  private _maxAngularVelocity = 100

  getMaxLinearVelocity(): number {
    return this._maxLinearVelocity
  }

  getMaxAngularVelocity(): number {
    return this._maxAngularVelocity
  }

  // ── Body ────────────────────────────────────────────────────────────────

  initBody(
    body: PhysicsBody,
    motionType: number,
    position: Vector3,
    orientation: Quaternion
  ): void {
    const J = this._jolt
    const layer =
      motionType === PhysicsMotionType.STATIC
        ? JoltPlugin.LAYER_NON_MOVING
        : JoltPlugin.LAYER_MOVING

    // Temp placeholder shape — will be replaced by setShape()
    const tempShape = new J.SphereShape(0.01)
    const pos = new J.RVec3(position.x, position.y, position.z)
    const rot = new J.Quat(
      orientation.x,
      orientation.y,
      orientation.z,
      orientation.w
    )

    const settings = new J.BodyCreationSettings(
      tempShape,
      pos,
      rot,
      this._toJoltMotionType(motionType),
      layer
    )

    const joltBody = this._bodyInterface.CreateBody(settings)
    J.destroy(settings)
    J.destroy(pos)
    J.destroy(rot)
    // tempShape is now owned by the body creation settings / body, don't destroy

    const bodyId = joltBody.GetID()
    this._bodyInterface.AddBody(
      bodyId,
      motionType === PhysicsMotionType.STATIC
        ? J.EActivation_DontActivate
        : J.EActivation_Activate
    )

    const pd: JoltBodyPluginData = {
      joltBody,
      bodyId,
      motionType,
    }
    ;(body as any)._pluginData = pd
    this._bodies.set(bodyId.GetIndexAndSequenceNumber(), { body, index: 0 })
  }

  initBodyInstances(
    _body: PhysicsBody,
    _motionType: number,
    _mesh: Mesh
  ): void {
    // Stub — thin instances not yet supported
  }

  updateBodyInstances(
    _body: PhysicsBody,
    _mesh: Mesh
  ): void {
    // Stub
  }

  removeBody(body: PhysicsBody): void {
    const pd = this._getPluginData(body)
    if (!pd?.bodyId) return
    if (this._bodyInterface.IsAdded(pd.bodyId)) {
      this._bodyInterface.RemoveBody(pd.bodyId)
    }
    this._bodies.delete(pd.bodyId.GetIndexAndSequenceNumber())
  }

  disposeBody(body: PhysicsBody): void {
    const pd = this._getPluginData(body)
    if (!pd?.bodyId) return
    if (this._bodyInterface.IsAdded(pd.bodyId)) {
      this._bodyInterface.RemoveBody(pd.bodyId)
    }
    this._bodyInterface.DestroyBody(pd.bodyId)
    this._bodies.delete(pd.bodyId.GetIndexAndSequenceNumber())
    ;(body as any)._pluginData = undefined
  }

  // ── Shape ───────────────────────────────────────────────────────────────

  initShape(
    shape: PhysicsShape,
    type: number,
    options: PhysicsShapeParameters
  ): void {
    const J = this._jolt
    let joltShape: any

    switch (type) {
      case PhysicsShapeType.SPHERE: {
        const radius = options.radius ?? 1
        joltShape = new J.SphereShape(radius)
        break
      }
      case PhysicsShapeType.BOX: {
        const extents = options.extents ?? new Vector3(1, 1, 1)
        // Clamp minimum half-extent to prevent degenerate shapes (e.g. flat ground)
        const minHE = 0.01
        const he = new J.Vec3(
          Math.max(extents.x / 2, minHE),
          Math.max(extents.y / 2, minHE),
          Math.max(extents.z / 2, minHE)
        )
        joltShape = new J.BoxShape(he, 0.05)
        J.destroy(he)
        break
      }
      case PhysicsShapeType.CAPSULE: {
        const pA = options.pointA ?? Vector3.Zero()
        const pB = options.pointB ?? new Vector3(0, 1, 0)
        const halfHeight = Vector3.Distance(pA, pB) / 2
        const radius = options.radius ?? 0.5
        joltShape = new J.CapsuleShape(halfHeight, radius)
        break
      }
      case PhysicsShapeType.CYLINDER: {
        const pA = options.pointA ?? Vector3.Zero()
        const pB = options.pointB ?? new Vector3(0, 1, 0)
        const halfHeight = Vector3.Distance(pA, pB) / 2
        const radius = options.radius ?? 0.5
        joltShape = new J.CylinderShape(halfHeight, radius, 0.05)
        break
      }
      case PhysicsShapeType.CONVEX_HULL: {
        joltShape = this._createConvexHullShape(options)
        break
      }
      case PhysicsShapeType.MESH: {
        joltShape = this._createMeshShape(options)
        break
      }
      case PhysicsShapeType.CONTAINER: {
        // Container = compound shape with no initial children
        joltShape = new J.SphereShape(0.01)
        break
      }
      case PhysicsShapeType.HEIGHTFIELD: {
        // Stub with placeholder
        joltShape = new J.SphereShape(1)
        break
      }
      default:
        joltShape = new J.SphereShape(1)
    }

    const pd: JoltShapePluginData = {
      joltShape,
      shapeType: type,
      density: 1000,
      material: { friction: 0.5, restitution: 0, staticFriction: 0.5 },
    }
    ;(shape as any)._pluginData = pd
  }

  private _createConvexHullShape(options: PhysicsShapeParameters): any {
    const J = this._jolt
    const mesh = options.mesh as any
    if (!mesh) return new J.SphereShape(1)

    const positions = mesh.getVerticesData?.(VertexBuffer.PositionKind)
    if (!positions || positions.length === 0) return new J.SphereShape(1)

    const settings = new J.ConvexHullShapeSettings()
    for (let i = 0; i < positions.length; i += 3) {
      const v = new J.Vec3(positions[i], positions[i + 1], positions[i + 2])
      settings.mPoints.push_back(v)
      J.destroy(v)
    }

    const result = settings.Create()
    J.destroy(settings)

    if (result.HasError()) {
      J.destroy(result)
      // Fallback: create a box from bounding info
      const bb = mesh.getBoundingInfo?.()?.boundingBox
      if (bb) {
        const ext = bb.extendSize
        const he = new J.Vec3(
          Math.max(ext.x, 0.01),
          Math.max(ext.y, 0.01),
          Math.max(ext.z, 0.01)
        )
        const fallback = new J.BoxShape(he, 0.05)
        J.destroy(he)
        return fallback
      }
      return new J.SphereShape(1)
    }

    const shape = result.Get()
    shape.AddRef()
    J.destroy(result)
    return shape
  }

  private _createMeshShape(options: PhysicsShapeParameters): any {
    const J = this._jolt
    const mesh = options.mesh as any
    if (!mesh) return new J.SphereShape(1)

    const positions = mesh.getVerticesData?.(VertexBuffer.PositionKind)
    const indices = mesh.getIndices?.()
    if (!positions || !indices || positions.length === 0)
      return new J.SphereShape(1)

    const settings = new J.MeshShapeSettings()
    const verts = new J.VertexList()
    for (let i = 0; i < positions.length; i += 3) {
      const v = new J.Float3(positions[i], positions[i + 1], positions[i + 2])
      verts.push_back(v)
      J.destroy(v)
    }
    settings.mTriangleVertices = verts

    const tris = new J.IndexedTriangleList()
    for (let i = 0; i < indices.length; i += 3) {
      const t = new J.IndexedTriangle()
      t.mIdx[0] = indices[i]
      t.mIdx[1] = indices[i + 1]
      t.mIdx[2] = indices[i + 2]
      t.mMaterialIndex = 0
      tris.push_back(t)
      J.destroy(t)
    }
    settings.mIndexedTriangles = tris

    const result = settings.Create()
    J.destroy(settings)
    J.destroy(verts)
    J.destroy(tris)

    if (result.HasError()) {
      J.destroy(result)
      return new J.SphereShape(1)
    }
    const shape = result.Get()
    shape.AddRef()
    J.destroy(result)
    return shape
  }

  disposeShape(shape: PhysicsShape): void {
    const pd = (shape as any)._pluginData as JoltShapePluginData
    if (!pd?.joltShape) return
    // Shapes are ref-counted; release our reference
    try {
      pd.joltShape.Release()
    } catch {
      // Some shapes (e.g. SphereShape created directly) aren't ref-counted
      try {
        this._jolt.destroy(pd.joltShape)
      } catch {
        // Already cleaned up
      }
    }
    ;(shape as any)._pluginData = undefined
  }

  setShape(body: PhysicsBody, shape: Nullable<PhysicsShape>): void {
    const bpd = this._getPluginData(body)
    if (!bpd?.bodyId) return
    if (!shape) return
    const spd = (shape as any)._pluginData as JoltShapePluginData
    if (!spd?.joltShape) return

    this._bodyInterface.SetShape(
      bpd.bodyId,
      spd.joltShape,
      true,
      this._jolt.EActivation_Activate
    )
  }

  getShape(body: PhysicsBody): Nullable<PhysicsShape> {
    // Babylon tracks this itself via body._shape
    return (body as any)._shape ?? null
  }

  getShapeType(shape: PhysicsShape): number {
    const pd = (shape as any)._pluginData as JoltShapePluginData
    return pd?.shapeType ?? PhysicsShapeType.SPHERE
  }

  // ── Velocity & forces ──────────────────────────────────────────────────

  setLinearVelocity(
    body: PhysicsBody,
    linVel: Vector3,
    instanceIndex?: number
  ): void {
    const pd = this._getPluginData(body, instanceIndex)
    if (!pd?.bodyId) return
    const v = new this._jolt.Vec3(linVel.x, linVel.y, linVel.z)
    this._bodyInterface.SetLinearVelocity(pd.bodyId, v)
    this._jolt.destroy(v)
  }

  getLinearVelocityToRef(
    body: PhysicsBody,
    linVel: Vector3,
    instanceIndex?: number
  ): void {
    const pd = this._getPluginData(body, instanceIndex)
    if (!pd?.bodyId) return
    const v = this._bodyInterface.GetLinearVelocity(pd.bodyId)
    linVel.set(v.GetX(), v.GetY(), v.GetZ())
  }

  setAngularVelocity(
    body: PhysicsBody,
    angVel: Vector3,
    instanceIndex?: number
  ): void {
    const pd = this._getPluginData(body, instanceIndex)
    if (!pd?.bodyId) return
    const v = new this._jolt.Vec3(angVel.x, angVel.y, angVel.z)
    this._bodyInterface.SetAngularVelocity(pd.bodyId, v)
    this._jolt.destroy(v)
  }

  getAngularVelocityToRef(
    body: PhysicsBody,
    angVel: Vector3,
    instanceIndex?: number
  ): void {
    const pd = this._getPluginData(body, instanceIndex)
    if (!pd?.bodyId) return
    const v = this._bodyInterface.GetAngularVelocity(pd.bodyId)
    angVel.set(v.GetX(), v.GetY(), v.GetZ())
  }

  applyImpulse(
    body: PhysicsBody,
    impulse: Vector3,
    location: Vector3,
    instanceIndex?: number
  ): void {
    const pd = this._getPluginData(body, instanceIndex)
    if (!pd?.bodyId) return
    const J = this._jolt
    const imp = new J.Vec3(impulse.x, impulse.y, impulse.z)
    const loc = new J.RVec3(location.x, location.y, location.z)
    this._bodyInterface.AddImpulse(pd.bodyId, imp, loc)
    J.destroy(imp)
    J.destroy(loc)
  }

  applyAngularImpulse(
    body: PhysicsBody,
    angularImpulse: Vector3,
    instanceIndex?: number
  ): void {
    const pd = this._getPluginData(body, instanceIndex)
    if (!pd?.bodyId) return
    const v = new this._jolt.Vec3(
      angularImpulse.x,
      angularImpulse.y,
      angularImpulse.z
    )
    this._bodyInterface.AddAngularImpulse(pd.bodyId, v)
    this._jolt.destroy(v)
  }

  applyForce(
    body: PhysicsBody,
    force: Vector3,
    location: Vector3,
    instanceIndex?: number
  ): void {
    const pd = this._getPluginData(body, instanceIndex)
    if (!pd?.bodyId) return
    const J = this._jolt
    const f = new J.Vec3(force.x, force.y, force.z)
    const loc = new J.RVec3(location.x, location.y, location.z)
    this._bodyInterface.AddForce(pd.bodyId, f, loc, J.EActivation_Activate)
    J.destroy(f)
    J.destroy(loc)
  }

  applyTorque(
    body: PhysicsBody,
    torque: Vector3,
    instanceIndex?: number
  ): void {
    const pd = this._getPluginData(body, instanceIndex)
    if (!pd?.bodyId) return
    const v = new this._jolt.Vec3(torque.x, torque.y, torque.z)
    this._bodyInterface.AddTorque(pd.bodyId, v, this._jolt.EActivation_Activate)
    this._jolt.destroy(v)
  }

  // ── Simulation step ─────────────────────────────────────────────────────

  private _lastStepTime = 0
  executeStep(delta: number, physicsBodies: Array<PhysicsBody>): void {
    // Babylon's getDeltaTime() measures the engine's rAF tick interval, not
    // the time between scene.render() calls. When the scene is frame-rate
    // throttled (e.g. 30fps on a 120Hz display), the delta passed here is
    // ~4x too small. We measure wall-clock time ourselves to get the correct dt.
    const now = performance.now()
    let dt: number
    if (this._lastStepTime > 0) {
      dt = (now - this._lastStepTime) / 1000 // ms → seconds
      // Cap at 100ms to prevent spiral-of-death after tab switch
      if (dt > 0.1) dt = 0.1
      if (dt <= 0) dt = this._fixedTimeStep
    } else {
      dt = this._fixedTimeStep
    }
    this._lastStepTime = now

    // Pre-step: push Babylon transforms to Jolt for kinematic bodies
    for (const body of physicsBodies) {
      if ((body as any)._prestepType === 0) continue // DISABLED
      const pd = this._getPluginData(body)
      if (!pd?.bodyId) continue
      this._preStep(body)
    }

    const numSteps = dt > 1 / 55 ? 2 : 1
    this._joltInterface.Step(dt, numSteps)

    // Post-step: sync Jolt transforms back to Babylon
    for (const body of physicsBodies) {
      const pd = this._getPluginData(body)
      if (!pd?.bodyId) continue
      if (!(body as any).disableSync) {
        this.sync(body)
      }
    }
  }

  private _preStep(body: PhysicsBody): void {
    const pd = this._getPluginData(body)
    if (!pd?.bodyId) return
    // Only prestep kinematic (ANIMATED) bodies — they're driven by code, not physics.
    // Dynamic bodies are physics-driven; static bodies never move.
    if (pd.motionType !== PhysicsMotionType.ANIMATED) return
    const tn = (body as any).transformNode as TransformNode
    if (!tn) return

    tn.computeWorldMatrix(true)
    const absPos = (tn as any).absolutePosition as Vector3
    const absRot = (tn as any).absoluteRotationQuaternion as Quaternion
    if (!absPos || !absRot) return

    const pos = new this._jolt.RVec3(absPos.x, absPos.y, absPos.z)
    const rot = new this._jolt.Quat(absRot.x, absRot.y, absRot.z, absRot.w)
    this._bodyInterface.MoveKinematic(pd.bodyId, pos, rot, this._fixedTimeStep)
    this._jolt.destroy(pos)
    this._jolt.destroy(rot)
  }

  sync(body: PhysicsBody): void {
    this.syncTransform(body, (body as any).transformNode)
  }

  syncTransform(body: PhysicsBody, transformNode: TransformNode): void {
    const pd = this._getPluginData(body)
    if (!pd?.bodyId || !transformNode) return

    const pos = this._bodyInterface.GetPosition(pd.bodyId)
    const rot = this._bodyInterface.GetRotation(pd.bodyId)

    const wx = pos.GetX()
    const wy = pos.GetY()
    const wz = pos.GetZ()
    const rx = rot.GetX()
    const ry = rot.GetY()
    const rz = rot.GetZ()
    const rw = rot.GetW()

    // pos/rot are [Value] returns (static singletons) — do NOT destroy

    const parent = transformNode.parent
    if (parent) {
      parent.computeWorldMatrix(true)
      const parentWorld = parent.getWorldMatrix()
      if (!parentWorld.isIdentity()) {
        const worldQuat = new Quaternion(rx, ry, rz, rw)
        const worldPos = new Vector3(wx, wy, wz)
        const worldMat = Matrix.Compose(
          transformNode.scaling,
          worldQuat,
          worldPos
        )
        const parentInv = Matrix.Invert(parentWorld)
        const localMat = worldMat.multiply(parentInv)
        localMat.decompose(
          transformNode.scaling,
          transformNode.rotationQuaternion!,
          transformNode.position
        )
        return
      }
    }

    transformNode.position.set(wx, wy, wz)
    if (transformNode.rotationQuaternion) {
      transformNode.rotationQuaternion.set(rx, ry, rz, rw)
    }
  }

  // ── Motion type ─────────────────────────────────────────────────────────

  setMotionType(
    body: PhysicsBody,
    motionType: number,
    instanceIndex?: number
  ): void {
    const pd = this._getPluginData(body, instanceIndex)
    if (!pd?.bodyId) return
    pd.motionType = motionType
    this._bodyInterface.SetMotionType(
      pd.bodyId,
      this._toJoltMotionType(motionType),
      this._jolt.EActivation_Activate
    )
  }

  getMotionType(body: PhysicsBody, instanceIndex?: number): number {
    const pd = this._getPluginData(body, instanceIndex)
    if (!pd?.bodyId) return PhysicsMotionType.STATIC
    const jmt = this._bodyInterface.GetMotionType(pd.bodyId)
    return this._fromJoltMotionType(jmt)
  }

  // ── Mass properties ─────────────────────────────────────────────────────

  setMassProperties(
    body: PhysicsBody,
    massProps: PhysicsMassProperties,
    _instanceIndex?: number
  ): void {
    const pd = this._getPluginData(body)
    if (!pd?.bodyId) return
    // Jolt doesn't have a direct "set mass" on BodyInterface for existing bodies.
    // We need to access the MotionProperties via the body directly.
    // For now, if mass is 0, switch to static; otherwise keep dynamic.
    if (massProps.mass !== undefined && massProps.mass === 0) {
      this.setMotionType(body, PhysicsMotionType.STATIC)
    }
  }

  getMassProperties(
    body: PhysicsBody,
    _instanceIndex?: number
  ): PhysicsMassProperties {
    return { mass: 1 }
  }

  computeMassProperties(
    body: PhysicsBody,
    _instanceIndex?: number
  ): PhysicsMassProperties {
    return { mass: 1 }
  }

  // ── Material ────────────────────────────────────────────────────────────

  setMaterial(shape: PhysicsShape, material: PhysicsMaterial): void {
    const spd = (shape as any)._pluginData as JoltShapePluginData
    if (!spd) return
    spd.material = {
      friction: (material as any).friction ?? 0.5,
      restitution: (material as any).restitution ?? 0,
      staticFriction: (material as any).staticFriction ?? (material as any).friction ?? 0.5,
    }

    // Apply to all bodies using this shape
    for (const [, { body }] of this._bodies) {
      const bShape = (body as any)._shape
      if (bShape === shape) {
        const bpd = this._getPluginData(body)
        if (bpd?.bodyId) {
          this._bodyInterface.SetFriction(bpd.bodyId, spd.material.friction)
          this._bodyInterface.SetRestitution(
            bpd.bodyId,
            spd.material.restitution
          )
        }
      }
    }
  }

  getMaterial(shape: PhysicsShape): PhysicsMaterial {
    const spd = (shape as any)._pluginData as JoltShapePluginData
    if (!spd) return { friction: 0.5, restitution: 0 } as any
    return spd.material as any
  }

  setDensity(shape: PhysicsShape, density: number): void {
    const spd = (shape as any)._pluginData as JoltShapePluginData
    if (spd) spd.density = density
  }

  getDensity(shape: PhysicsShape): number {
    const spd = (shape as any)._pluginData as JoltShapePluginData
    return spd?.density ?? 1000
  }

  // ── Damping ─────────────────────────────────────────────────────────────

  setLinearDamping(
    body: PhysicsBody,
    damping: number,
    _instanceIndex?: number
  ): void {
    const pd = this._getPluginData(body)
    if (!pd?.joltBody) return
    pd.joltBody.GetMotionProperties()?.SetLinearDamping(damping)
  }

  getLinearDamping(body: PhysicsBody, _instanceIndex?: number): number {
    const pd = this._getPluginData(body)
    return pd?.joltBody?.GetMotionProperties()?.GetLinearDamping() ?? 0
  }

  setAngularDamping(
    body: PhysicsBody,
    damping: number,
    _instanceIndex?: number
  ): void {
    const pd = this._getPluginData(body)
    if (!pd?.joltBody) return
    pd.joltBody.GetMotionProperties()?.SetAngularDamping(damping)
  }

  getAngularDamping(body: PhysicsBody, _instanceIndex?: number): number {
    const pd = this._getPluginData(body)
    return pd?.joltBody?.GetMotionProperties()?.GetAngularDamping() ?? 0
  }

  // ── Gravity factor ──────────────────────────────────────────────────────

  setGravityFactor(
    body: PhysicsBody,
    factor: number,
    _instanceIndex?: number
  ): void {
    const pd = this._getPluginData(body)
    if (!pd?.bodyId) return
    this._bodyInterface.SetGravityFactor(pd.bodyId, factor)
  }

  getGravityFactor(body: PhysicsBody, _instanceIndex?: number): number {
    const pd = this._getPluginData(body)
    if (!pd?.bodyId) return 1
    return this._bodyInterface.GetGravityFactor(pd.bodyId)
  }

  // ── Target transform (for animated bodies) ─────────────────────────────

  setTargetTransform(
    body: PhysicsBody,
    position: Vector3,
    rotation: Quaternion,
    _instanceIndex?: number
  ): void {
    const pd = this._getPluginData(body)
    if (!pd?.bodyId) return
    const J = this._jolt
    const pos = new J.RVec3(position.x, position.y, position.z)
    const rot = new J.Quat(rotation.x, rotation.y, rotation.z, rotation.w)
    this._bodyInterface.MoveKinematic(pd.bodyId, pos, rot, this._fixedTimeStep)
    J.destroy(pos)
    J.destroy(rot)
  }

  // ── Debug geometry ──────────────────────────────────────────────────────

  getBodyGeometry(body: PhysicsBody): {
    positions: Float32Array
    indices: Uint32Array
  } {
    const empty = {
      positions: new Float32Array(0),
      indices: new Uint32Array(0),
    }
    const bpd = this._getPluginData(body)
    if (!bpd?.bodyId) return empty

    const bShape = (body as any)._shape
    if (!bShape) return empty
    const spd = (bShape as any)._pluginData as JoltShapePluginData
    if (!spd?.joltShape) return empty

    switch (spd.shapeType) {
      case PhysicsShapeType.BOX:
        return this._boxGeometry(spd.joltShape)
      case PhysicsShapeType.SPHERE:
        return this._sphereGeometry(spd.joltShape)
      case PhysicsShapeType.CAPSULE:
        return this._capsuleGeometry(spd.joltShape)
      case PhysicsShapeType.CYLINDER:
        return this._cylinderGeometry(spd.joltShape)
      case PhysicsShapeType.CONVEX_HULL:
        return this._convexHullGeometry(spd.joltShape)
      default:
        return empty
    }
  }

  private _boxGeometry(shape: any): {
    positions: Float32Array
    indices: Uint32Array
  } {
    const he = shape.GetHalfExtent()
    const x = he.GetX(),
      y = he.GetY(),
      z = he.GetZ()
    // prettier-ignore
    const positions = new Float32Array([
      -x,-y,-z,  x,-y,-z,  x,y,-z,  -x,y,-z,
      -x,-y,z,   x,-y,z,   x,y,z,   -x,y,z,
    ])
    // prettier-ignore
    const indices = new Uint32Array([
      0,1,2, 0,2,3, 4,6,5, 4,7,6,
      0,4,5, 0,5,1, 2,6,7, 2,7,3,
      0,3,7, 0,7,4, 1,5,6, 1,6,2,
    ])
    return { positions, indices }
  }

  private _sphereGeometry(shape: any): {
    positions: Float32Array
    indices: Uint32Array
  } {
    const r = shape.GetRadius()
    const segs = 12
    const rings = 8
    const verts: number[] = []
    const idx: number[] = []

    for (let ring = 0; ring <= rings; ring++) {
      const phi = (Math.PI * ring) / rings
      for (let seg = 0; seg <= segs; seg++) {
        const theta = (2 * Math.PI * seg) / segs
        verts.push(
          r * Math.sin(phi) * Math.cos(theta),
          r * Math.cos(phi),
          r * Math.sin(phi) * Math.sin(theta)
        )
      }
    }

    for (let ring = 0; ring < rings; ring++) {
      for (let seg = 0; seg < segs; seg++) {
        const a = ring * (segs + 1) + seg
        const b = a + segs + 1
        idx.push(a, b, a + 1)
        idx.push(a + 1, b, b + 1)
      }
    }

    return {
      positions: new Float32Array(verts),
      indices: new Uint32Array(idx),
    }
  }

  private _capsuleGeometry(shape: any): {
    positions: Float32Array
    indices: Uint32Array
  } {
    const r = shape.GetRadius()
    const hh = shape.GetHalfHeightOfCylinder()
    // Approximate with a stretched sphere
    const segs = 12
    const rings = 8
    const verts: number[] = []
    const idx: number[] = []

    for (let ring = 0; ring <= rings; ring++) {
      const phi = (Math.PI * ring) / rings
      const yOffset = Math.cos(phi) >= 0 ? hh : -hh
      for (let seg = 0; seg <= segs; seg++) {
        const theta = (2 * Math.PI * seg) / segs
        verts.push(
          r * Math.sin(phi) * Math.cos(theta),
          r * Math.cos(phi) + yOffset,
          r * Math.sin(phi) * Math.sin(theta)
        )
      }
    }

    for (let ring = 0; ring < rings; ring++) {
      for (let seg = 0; seg < segs; seg++) {
        const a = ring * (segs + 1) + seg
        const b = a + segs + 1
        idx.push(a, b, a + 1)
        idx.push(a + 1, b, b + 1)
      }
    }

    return {
      positions: new Float32Array(verts),
      indices: new Uint32Array(idx),
    }
  }

  private _cylinderGeometry(shape: any): {
    positions: Float32Array
    indices: Uint32Array
  } {
    const r = shape.GetRadius()
    const hh = shape.GetHalfHeight()
    const segs = 12
    const verts: number[] = []
    const idx: number[] = []

    // Top + bottom circle verts
    for (let i = 0; i <= segs; i++) {
      const theta = (2 * Math.PI * i) / segs
      const cx = r * Math.cos(theta)
      const cz = r * Math.sin(theta)
      verts.push(cx, hh, cz)
      verts.push(cx, -hh, cz)
    }

    for (let i = 0; i < segs; i++) {
      const t0 = i * 2
      const t1 = t0 + 1
      const t2 = t0 + 2
      const t3 = t0 + 3
      idx.push(t0, t1, t2)
      idx.push(t2, t1, t3)
    }

    return {
      positions: new Float32Array(verts),
      indices: new Uint32Array(idx),
    }
  }

  private _convexHullGeometry(shape: any): {
    positions: Float32Array
    indices: Uint32Array
  } {
    // ConvexHullShape doesn't expose GetNumPoints/GetPoint in the JS bindings
    // Use the shape's local bounds as a box approximation for debug display
    try {
      const bounds = shape.GetLocalBounds()
      const min = bounds.mMin ?? bounds.GetMin?.()
      const max = bounds.mMax ?? bounds.GetMax?.()
      if (min && max) {
        const x0 = min.GetX(),
          y0 = min.GetY(),
          z0 = min.GetZ()
        const x1 = max.GetX(),
          y1 = max.GetY(),
          z1 = max.GetZ()
        // prettier-ignore
        const positions = new Float32Array([
          x0,y0,z0, x1,y0,z0, x1,y1,z0, x0,y1,z0,
          x0,y0,z1, x1,y0,z1, x1,y1,z1, x0,y1,z1,
        ])
        // prettier-ignore
        const indices = new Uint32Array([
          0,1,2, 0,2,3, 4,6,5, 4,7,6,
          0,4,5, 0,5,1, 2,6,7, 2,7,3,
          0,3,7, 0,7,4, 1,5,6, 1,6,2,
        ])
        return { positions, indices }
      }
    } catch {
      // Fall through
    }
    return { positions: new Float32Array(0), indices: new Uint32Array(0) }
  }

  getBodyBoundingBox(body: PhysicsBody): BoundingBox {
    const pd = this._getPluginData(body)
    if (!pd?.joltBody) return new BoundingBox(Vector3.Zero(), Vector3.Zero())
    try {
      const bounds = pd.joltBody.GetWorldSpaceBounds()
      const min = bounds.mMin ?? bounds.GetMin?.()
      const max = bounds.mMax ?? bounds.GetMax?.()
      if (min && max) {
        return new BoundingBox(
          new Vector3(min.GetX(), min.GetY(), min.GetZ()),
          new Vector3(max.GetX(), max.GetY(), max.GetZ())
        )
      }
    } catch {
      // Fall through
    }
    return new BoundingBox(Vector3.Zero(), Vector3.Zero())
  }

  getBoundingBox(shape: PhysicsShape): BoundingBox {
    const spd = (shape as any)._pluginData as JoltShapePluginData
    if (!spd?.joltShape)
      return new BoundingBox(Vector3.Zero(), Vector3.Zero())
    try {
      const bounds = spd.joltShape.GetLocalBounds()
      const min = bounds.mMin ?? bounds.GetMin?.()
      const max = bounds.mMax ?? bounds.GetMax?.()
      if (min && max) {
        return new BoundingBox(
          new Vector3(min.GetX(), min.GetY(), min.GetZ()),
          new Vector3(max.GetX(), max.GetY(), max.GetZ())
        )
      }
    } catch {
      // Fall through
    }
    return new BoundingBox(Vector3.Zero(), Vector3.Zero())
  }

  // ── Event masks ─────────────────────────────────────────────────────────

  setEventMask(
    _body: PhysicsBody,
    _eventMask: number,
    _instanceIndex?: number
  ): void {}

  getEventMask(_body: PhysicsBody, _instanceIndex?: number): number {
    return 0
  }

  // ── Collision callbacks (stubs) ─────────────────────────────────────────

  setCollisionCallbackEnabled(
    _body: PhysicsBody,
    _enabled: boolean,
    _instanceIndex?: number
  ): void {}

  setCollisionEndedCallbackEnabled(
    _body: PhysicsBody,
    _enabled: boolean,
    _instanceIndex?: number
  ): void {}

  getCollisionObservable(
    _body: PhysicsBody,
    _instanceIndex?: number
  ): Observable<IPhysicsCollisionEvent> {
    return new Observable()
  }

  getCollisionEndedObservable(
    _body: PhysicsBody,
    _instanceIndex?: number
  ): Observable<IBasePhysicsCollisionEvent> {
    return new Observable()
  }

  // ── Trigger (stub) ──────────────────────────────────────────────────────

  setTrigger(_shape: PhysicsShape, _isTrigger: boolean): void {}

  // ── Constraints (stubs) ─────────────────────────────────────────────────

  initConstraint(
    _constraint: PhysicsConstraint,
    _body: PhysicsBody,
    _childBody: PhysicsBody
  ): void {}

  addConstraint(
    _body: PhysicsBody,
    _childBody: PhysicsBody,
    _constraint: PhysicsConstraint,
    _instanceIndex?: number,
    _childInstanceIndex?: number
  ): void {}

  disposeConstraint(_constraint: PhysicsConstraint): void {}

  setEnabled(_constraint: PhysicsConstraint, _isEnabled: boolean): void {}

  getEnabled(_constraint: PhysicsConstraint): boolean {
    return false
  }

  setCollisionsEnabled(
    _constraint: PhysicsConstraint,
    _isEnabled: boolean
  ): void {}

  getCollisionsEnabled(_constraint: PhysicsConstraint): boolean {
    return false
  }

  setAxisFriction(
    _constraint: PhysicsConstraint,
    _axis: PhysicsConstraintAxis,
    _friction: number
  ): void {}

  getAxisFriction(
    _constraint: PhysicsConstraint,
    _axis: PhysicsConstraintAxis
  ): Nullable<number> {
    return null
  }

  setAxisMode(
    _constraint: PhysicsConstraint,
    _axis: PhysicsConstraintAxis,
    _limitMode: PhysicsConstraintAxisLimitMode
  ): void {}

  getAxisMode(
    _constraint: PhysicsConstraint,
    _axis: PhysicsConstraintAxis
  ): Nullable<PhysicsConstraintAxisLimitMode> {
    return null
  }

  setAxisMinLimit(
    _constraint: PhysicsConstraint,
    _axis: PhysicsConstraintAxis,
    _minLimit: number
  ): void {}

  getAxisMinLimit(
    _constraint: PhysicsConstraint,
    _axis: PhysicsConstraintAxis
  ): Nullable<number> {
    return null
  }

  setAxisMaxLimit(
    _constraint: PhysicsConstraint,
    _axis: PhysicsConstraintAxis,
    _limit: number
  ): void {}

  getAxisMaxLimit(
    _constraint: PhysicsConstraint,
    _axis: PhysicsConstraintAxis
  ): Nullable<number> {
    return null
  }

  setAxisMotorType(
    _constraint: PhysicsConstraint,
    _axis: PhysicsConstraintAxis,
    _motorType: PhysicsConstraintMotorType
  ): void {}

  getAxisMotorType(
    _constraint: PhysicsConstraint,
    _axis: PhysicsConstraintAxis
  ): Nullable<PhysicsConstraintMotorType> {
    return null
  }

  setAxisMotorTarget(
    _constraint: PhysicsConstraint,
    _axis: PhysicsConstraintAxis,
    _target: number
  ): void {}

  getAxisMotorTarget(
    _constraint: PhysicsConstraint,
    _axis: PhysicsConstraintAxis
  ): Nullable<number> {
    return null
  }

  setAxisMotorMaxForce(
    _constraint: PhysicsConstraint,
    _axis: PhysicsConstraintAxis,
    _maxForce: number
  ): void {}

  getAxisMotorMaxForce(
    _constraint: PhysicsConstraint,
    _axis: PhysicsConstraintAxis
  ): Nullable<number> {
    return null
  }

  getBodiesUsingConstraint(
    _constraint: PhysicsConstraint
  ): ConstrainedBodyPair[] {
    return []
  }

  // ── Shape filter masks (stubs) ──────────────────────────────────────────

  setShapeFilterMembershipMask(
    _shape: PhysicsShape,
    _membershipMask: number
  ): void {}

  getShapeFilterMembershipMask(_shape: PhysicsShape): number {
    return 0xffffffff
  }

  setShapeFilterCollideMask(
    _shape: PhysicsShape,
    _collideMask: number
  ): void {}

  getShapeFilterCollideMask(_shape: PhysicsShape): number {
    return 0xffffffff
  }

  // ── Child shapes (for container) ────────────────────────────────────────

  addChild(
    _shape: PhysicsShape,
    _newChild: PhysicsShape,
    _translation?: Vector3,
    _rotation?: Quaternion,
    _scale?: Vector3
  ): void {}

  removeChild(_shape: PhysicsShape, _childIndex: number): void {}

  getNumChildren(_shape: PhysicsShape): number {
    return 0
  }

  // ── Raycast (stub) ──────────────────────────────────────────────────────

  raycast(
    _from: Vector3,
    _to: Vector3,
    _result: PhysicsRaycastResult | Array<PhysicsRaycastResult>,
    _query?: any
  ): void {}

  // ── Dispose ─────────────────────────────────────────────────────────────

  dispose(): void {
    this._jolt.destroy(this._joltInterface)
    this._bodies.clear()
  }
}
