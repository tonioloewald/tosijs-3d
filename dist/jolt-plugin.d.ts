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
import { Observable } from '@babylonjs/core/Misc/observable';
import { Vector3, Quaternion } from '@babylonjs/core/Maths/math.vector';
import { BoundingBox } from '@babylonjs/core/Culling/boundingBox';
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { Nullable } from '@babylonjs/core/types';
import type { PhysicsBody } from '@babylonjs/core/Physics/v2/physicsBody';
import type { PhysicsShape } from '@babylonjs/core/Physics/v2/physicsShape';
import type { PhysicsConstraint } from '@babylonjs/core/Physics/v2/physicsConstraint';
import type { PhysicsMaterial } from '@babylonjs/core/Physics/v2/physicsMaterial';
import type { PhysicsRaycastResult } from '@babylonjs/core/Physics/physicsRaycastResult';
import type { IPhysicsEnginePluginV2, IPhysicsCollisionEvent, IBasePhysicsCollisionEvent, PhysicsShapeParameters, PhysicsMassProperties, PhysicsConstraintAxis, PhysicsConstraintAxisLimitMode, PhysicsConstraintMotorType, ConstrainedBodyPair } from '@babylonjs/core/Physics/v2/IPhysicsEnginePlugin';
export declare class JoltPlugin implements IPhysicsEnginePluginV2 {
    world: any;
    name: string;
    onCollisionObservable: Observable<IPhysicsCollisionEvent>;
    onCollisionEndedObservable: Observable<IBasePhysicsCollisionEvent>;
    onTriggerCollisionObservable: Observable<IBasePhysicsCollisionEvent>;
    private _jolt;
    private _joltInterface;
    private _bodyInterface;
    private _fixedTimeStep;
    private _useDeltaForWorldStep;
    private _bodies;
    static readonly LAYER_NON_MOVING = 0;
    static readonly LAYER_MOVING = 1;
    constructor(joltModule: any, useDeltaForWorldStep?: boolean);
    private _toJoltMotionType;
    private _fromJoltMotionType;
    private _getPluginData;
    getPluginVersion(): number;
    setGravity(gravity: Vector3): void;
    setTimeStep(timeStep: number): void;
    getTimeStep(): number;
    setVelocityLimits(maxLinear: number, maxAngular: number): void;
    private _maxLinearVelocity;
    private _maxAngularVelocity;
    getMaxLinearVelocity(): number;
    getMaxAngularVelocity(): number;
    initBody(body: PhysicsBody, motionType: number, position: Vector3, orientation: Quaternion): void;
    initBodyInstances(_body: PhysicsBody, _motionType: number, _mesh: Mesh): void;
    updateBodyInstances(_body: PhysicsBody, _mesh: Mesh): void;
    removeBody(body: PhysicsBody): void;
    disposeBody(body: PhysicsBody): void;
    initShape(shape: PhysicsShape, type: number, options: PhysicsShapeParameters): void;
    private _createConvexHullShape;
    private _createMeshShape;
    disposeShape(shape: PhysicsShape): void;
    setShape(body: PhysicsBody, shape: Nullable<PhysicsShape>): void;
    getShape(body: PhysicsBody): Nullable<PhysicsShape>;
    getShapeType(shape: PhysicsShape): number;
    setLinearVelocity(body: PhysicsBody, linVel: Vector3, instanceIndex?: number): void;
    getLinearVelocityToRef(body: PhysicsBody, linVel: Vector3, instanceIndex?: number): void;
    setAngularVelocity(body: PhysicsBody, angVel: Vector3, instanceIndex?: number): void;
    getAngularVelocityToRef(body: PhysicsBody, angVel: Vector3, instanceIndex?: number): void;
    applyImpulse(body: PhysicsBody, impulse: Vector3, location: Vector3, instanceIndex?: number): void;
    applyAngularImpulse(body: PhysicsBody, angularImpulse: Vector3, instanceIndex?: number): void;
    applyForce(body: PhysicsBody, force: Vector3, location: Vector3, instanceIndex?: number): void;
    applyTorque(body: PhysicsBody, torque: Vector3, instanceIndex?: number): void;
    private _lastStepTime;
    executeStep(_delta: number, physicsBodies: Array<PhysicsBody>): void;
    private _preStep;
    sync(body: PhysicsBody): void;
    syncTransform(body: PhysicsBody, transformNode: TransformNode): void;
    setMotionType(body: PhysicsBody, motionType: number, instanceIndex?: number): void;
    getMotionType(body: PhysicsBody, instanceIndex?: number): number;
    setMassProperties(body: PhysicsBody, massProps: PhysicsMassProperties, _instanceIndex?: number): void;
    getMassProperties(_body: PhysicsBody, _instanceIndex?: number): PhysicsMassProperties;
    computeMassProperties(_body: PhysicsBody, _instanceIndex?: number): PhysicsMassProperties;
    setMaterial(shape: PhysicsShape, material: PhysicsMaterial): void;
    getMaterial(shape: PhysicsShape): PhysicsMaterial;
    setDensity(shape: PhysicsShape, density: number): void;
    getDensity(shape: PhysicsShape): number;
    setLinearDamping(body: PhysicsBody, damping: number, _instanceIndex?: number): void;
    getLinearDamping(body: PhysicsBody, _instanceIndex?: number): number;
    setAngularDamping(body: PhysicsBody, damping: number, _instanceIndex?: number): void;
    getAngularDamping(body: PhysicsBody, _instanceIndex?: number): number;
    setGravityFactor(body: PhysicsBody, factor: number, _instanceIndex?: number): void;
    getGravityFactor(body: PhysicsBody, _instanceIndex?: number): number;
    setTargetTransform(body: PhysicsBody, position: Vector3, rotation: Quaternion, _instanceIndex?: number): void;
    getBodyGeometry(body: PhysicsBody): {
        positions: Float32Array;
        indices: Uint32Array;
    };
    private _boxGeometry;
    private _sphereGeometry;
    private _capsuleGeometry;
    private _cylinderGeometry;
    private _convexHullGeometry;
    getBodyBoundingBox(body: PhysicsBody): BoundingBox;
    getBoundingBox(shape: PhysicsShape): BoundingBox;
    setEventMask(_body: PhysicsBody, _eventMask: number, _instanceIndex?: number): void;
    getEventMask(_body: PhysicsBody, _instanceIndex?: number): number;
    setCollisionCallbackEnabled(_body: PhysicsBody, _enabled: boolean, _instanceIndex?: number): void;
    setCollisionEndedCallbackEnabled(_body: PhysicsBody, _enabled: boolean, _instanceIndex?: number): void;
    getCollisionObservable(_body: PhysicsBody, _instanceIndex?: number): Observable<IPhysicsCollisionEvent>;
    getCollisionEndedObservable(_body: PhysicsBody, _instanceIndex?: number): Observable<IBasePhysicsCollisionEvent>;
    setTrigger(_shape: PhysicsShape, _isTrigger: boolean): void;
    initConstraint(_constraint: PhysicsConstraint, _body: PhysicsBody, _childBody: PhysicsBody): void;
    addConstraint(_body: PhysicsBody, _childBody: PhysicsBody, _constraint: PhysicsConstraint, _instanceIndex?: number, _childInstanceIndex?: number): void;
    disposeConstraint(_constraint: PhysicsConstraint): void;
    setEnabled(_constraint: PhysicsConstraint, _isEnabled: boolean): void;
    getEnabled(_constraint: PhysicsConstraint): boolean;
    setCollisionsEnabled(_constraint: PhysicsConstraint, _isEnabled: boolean): void;
    getCollisionsEnabled(_constraint: PhysicsConstraint): boolean;
    setAxisFriction(_constraint: PhysicsConstraint, _axis: PhysicsConstraintAxis, _friction: number): void;
    getAxisFriction(_constraint: PhysicsConstraint, _axis: PhysicsConstraintAxis): Nullable<number>;
    setAxisMode(_constraint: PhysicsConstraint, _axis: PhysicsConstraintAxis, _limitMode: PhysicsConstraintAxisLimitMode): void;
    getAxisMode(_constraint: PhysicsConstraint, _axis: PhysicsConstraintAxis): Nullable<PhysicsConstraintAxisLimitMode>;
    setAxisMinLimit(_constraint: PhysicsConstraint, _axis: PhysicsConstraintAxis, _minLimit: number): void;
    getAxisMinLimit(_constraint: PhysicsConstraint, _axis: PhysicsConstraintAxis): Nullable<number>;
    setAxisMaxLimit(_constraint: PhysicsConstraint, _axis: PhysicsConstraintAxis, _limit: number): void;
    getAxisMaxLimit(_constraint: PhysicsConstraint, _axis: PhysicsConstraintAxis): Nullable<number>;
    setAxisMotorType(_constraint: PhysicsConstraint, _axis: PhysicsConstraintAxis, _motorType: PhysicsConstraintMotorType): void;
    getAxisMotorType(_constraint: PhysicsConstraint, _axis: PhysicsConstraintAxis): Nullable<PhysicsConstraintMotorType>;
    setAxisMotorTarget(_constraint: PhysicsConstraint, _axis: PhysicsConstraintAxis, _target: number): void;
    getAxisMotorTarget(_constraint: PhysicsConstraint, _axis: PhysicsConstraintAxis): Nullable<number>;
    setAxisMotorMaxForce(_constraint: PhysicsConstraint, _axis: PhysicsConstraintAxis, _maxForce: number): void;
    getAxisMotorMaxForce(_constraint: PhysicsConstraint, _axis: PhysicsConstraintAxis): Nullable<number>;
    getBodiesUsingConstraint(_constraint: PhysicsConstraint): ConstrainedBodyPair[];
    setShapeFilterMembershipMask(_shape: PhysicsShape, _membershipMask: number): void;
    getShapeFilterMembershipMask(_shape: PhysicsShape): number;
    setShapeFilterCollideMask(_shape: PhysicsShape, _collideMask: number): void;
    getShapeFilterCollideMask(_shape: PhysicsShape): number;
    addChild(_shape: PhysicsShape, _newChild: PhysicsShape, _translation?: Vector3, _rotation?: Quaternion, _scale?: Vector3): void;
    removeChild(_shape: PhysicsShape, _childIndex: number): void;
    getNumChildren(_shape: PhysicsShape): number;
    raycast(_from: Vector3, _to: Vector3, _result: PhysicsRaycastResult | Array<PhysicsRaycastResult>, _query?: any): void;
    dispose(): void;
}
//# sourceMappingURL=jolt-plugin.d.ts.map