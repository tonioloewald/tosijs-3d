import type { EntityId, EntityIntent, EventHandler, SpawnSpec, Unsubscribe, WorldEntity, WorldState, Zone, ZoneId, MinSimApi, Place, Portal, PlacedEntity, Anchor, SteerTarget, Choice, SchematicView, Proximity, EntityKind, PlaceId, PortalId, ChoiceId } from './world-contract';
export declare class WorldStore implements MinSimApi {
    private state;
    private handlers;
    private nextId;
    /** Per-entity zone membership, so we only emit on a fresh boundary crossing. */
    private occupancy;
    private places;
    private portals;
    private entityPlace;
    private labels;
    private steers;
    private choices;
    constructor();
    spawn(spec: SpawnSpec): EntityId;
    forget(id: EntityId): void;
    setIntent(id: EntityId, intent: EntityIntent | null): void;
    defineZone(id: ZoneId, zone: Zone): void;
    removeZone(id: ZoneId): void;
    getState(): Readonly<WorldState>;
    getEntity(id: EntityId): Readonly<WorldEntity> | undefined;
    query(predicate: (entity: Readonly<WorldEntity>) => boolean): WorldEntity[];
    subscribe(handler: EventHandler): Unsubscribe;
    /**
     * Deliver an event to current subscribers. Best-effort by contract: a real
     * engine may throttle or drop these. A handler that throws does not break
     * the simulation or starve other handlers.
     */
    private emit;
    /** Advance sim-time. The store is the only clock the driver ever sees. */
    tick(deltaSeconds: number): void;
    /** Move an entity, emitting zoneEntered for any newly-entered driver zone. */
    moveEntity(id: EntityId, position: {
        x: number;
        y: number;
        z: number;
    }): void;
    /**
     * A definite, intentional engagement (the commitment, not the approach).
     * Stamps lastInteractedAt and emits an interaction event referencing the
     * target's stable id — the fingerprint a driver recognizes.
     */
    interact(actorId: EntityId, targetId: EntityId): void;
    chooseConversation(actorId: EntityId, targetId: EntityId, optionId: string): void;
    /** Move an item entity out of the world and into an actor's inventory. */
    pickUp(actorId: EntityId, itemId: EntityId): void;
    /** Systemic damage. Resolves death in-engine and emits it; no blessing needed. */
    applyDamage(targetId: EntityId, amount: number, killerId?: EntityId): void;
    definePlace(place: Place): void;
    definePortal(portal: Portal): void;
    placeEntity(spec: {
        id: EntityId;
        kind: EntityKind;
        label: string;
        ref?: unknown;
    }, at: Anchor): void;
    /** Set or (with null) clear relational steering — resolved each `tick` (approach/flee/travel). */
    steer(id: EntityId, target: SteerTarget | null): void;
    /** Move through a portal → change place, land near the new place's origin, emit `placeEntered`. */
    traverse(id: EntityId, portal: PortalId): void;
    presentChoice(choice: Choice): void;
    /**
     * The player's pick → emits `choiceMade` (mirrors `chooseConversation`). The sim reports the
     * pick; it NEVER resolves the choice — adjudication is the driver's. Not part of `MinSimApi`
     * (which is driver-facing: `presentChoice`); this is the player-side act.
     */
    chooseOption(choiceId: ChoiceId, optionId: string): void;
    placeOf(id: EntityId): PlaceId;
    contentsOf(place: PlaceId): PlacedEntity[];
    portalsOf(place: PlaceId): Portal[];
    route(from: PlaceId, to: PlaceId): {
        portals: PortalId[];
        cost: number;
    } | null;
    proximity(a: EntityId, b: EntityId): Proximity;
    schematic(place: PlaceId, observer?: EntityId): SchematicView;
    private _placed;
    /** A deterministic sim-private origin per place, spread far apart so places never overlap in the
     * shared internal space (absolute position is irrelevant — proximity is intra-place). */
    private _placeOrigin;
    /** Turn a relational `Anchor` into a sim-private position: near an entity at a rung, else spread
     * around the place origin. Golden-angle placement keeps a crowd from stacking on one point. */
    private _anchorPosition;
    /** Resolve active steers each tick: approach an entity, flee one, or walk toward a place (one
     * portal hop per tick). Coarse on purpose — the point is that PROXIMITY changes, not kinematics. */
    private _resolveSteers;
}
//# sourceMappingURL=world-store.d.ts.map