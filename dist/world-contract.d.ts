/** Plain {x, y, z} vector — no Babylon dependency, matches the pure modules. */
export type Vec3 = {
    x: number;
    y: number;
    z: number;
};
export type EntityId = string;
export type ZoneId = string;
/**
 * Coarse, narrative-blind classification. The union documents the common
 * kinds; `(string & {})` keeps autocomplete while allowing any string, so a
 * driver can introduce new kinds without editing this file.
 */
export type EntityKind = 'player' | 'npc' | 'item' | 'prop' | 'container' | (string & {});
export type HealthComponent = {
    current: number;
    max: number;
    dead: boolean;
};
/** itemId is a stable EntityId so the driver can correlate held items. */
export type InventoryEntry = {
    itemId: EntityId;
    quantity: number;
};
export type FactionComponent = {
    id: string;
    /** -1 (hostile) .. 0 (neutral) .. 1 (friendly). Systemic, not narrative. */
    dispositionToPlayer: number;
};
export type InteractableComponent = {
    /** Opaque handle for the prompt the UI shows ("talk", "open"…). */
    promptId?: string;
    locked: boolean;
};
export type EntityComponents = {
    health?: HealthComponent;
    inventory?: InventoryEntry[];
    faction?: FactionComponent;
    interactable?: InteractableComponent;
};
/** An entity as the simulation knows it — physical + systemic facts only. */
export type WorldEntity = {
    id: EntityId;
    kind: EntityKind;
    position: Vec3;
    /**
     * Opaque, driver-owned. The simulation stores and echoes it but NEVER reads
     * or interprets it — it carries no narrative meaning to the sim.
     */
    ref?: unknown;
    /**
     * Systemic stamp: sim-time of the last interaction, or undefined if never.
     * Lets the driver verify engagement by query instead of trusting the lossy
     * event stream. Narrative-blind — it just means "this was interacted with".
     */
    lastInteractedAt?: number;
    components: EntityComponents;
};
export type Behavior = 'idle' | 'patrol' | 'flee' | 'follow' | 'stay';
/**
 * Advisory steering the driver layers over an entity's autonomous behavior.
 * Valid-until-changed (NOT a per-frame command). The sim satisfies goals
 * smoothly; it is free to be late or to ignore an intent it cannot honor.
 */
export type EntityIntent = {
    /** Smooth navigation target. null clears it. */
    steeringGoal?: Vec3 | null;
    behavior?: Behavior;
    /**
     * Hard mechanical override — reserved for the rare beat that genuinely needs
     * determinism. Prefer steeringGoal/behavior; snapping looks bad in motion.
     */
    lock?: {
        disableInteraction?: boolean;
        forcePosition?: Vec3 | null;
    };
};
/** A driver-defined region. Crossing it is a discrete, fingerprinted event. */
export type Zone = {
    center: Vec3;
    radius: number;
};
export type WorldState = {
    /** Sim-time in seconds. Engine-owned; the sim is the only clock. */
    now: number;
    playerId: EntityId;
    /** Engine-owned facts. The player is just an entity of kind 'player'. */
    entities: Record<EntityId, WorldEntity>;
    /** Driver-owned, advisory. Absent id = no intent = autonomous default. */
    intents: Record<EntityId, EntityIntent>;
    /** Driver-owned, narrative-blind regions. */
    zones: Record<ZoneId, Zone>;
};
export type SimulationEvent = {
    type: 'interaction';
    at: number;
    actorId: EntityId;
    targetId: EntityId;
} | {
    type: 'pickup';
    at: number;
    actorId: EntityId;
    itemId: EntityId;
} | {
    type: 'drop';
    at: number;
    actorId: EntityId;
    itemId: EntityId;
} | {
    type: 'conversationChoice';
    at: number;
    actorId: EntityId;
    targetId: EntityId;
    optionId: string;
} | {
    type: 'transaction';
    at: number;
    sourceId: EntityId;
    targetId: EntityId;
    itemId: EntityId;
    quantity: number;
} | {
    type: 'death';
    at: number;
    entityId: EntityId;
    killerId?: EntityId;
} | {
    type: 'zoneEntered';
    at: number;
    entityId: EntityId;
    zoneId: ZoneId;
} | {
    type: 'placeEntered';
    at: number;
    entityId: EntityId;
    placeId: PlaceId;
} | {
    type: 'choiceMade';
    at: number;
    choiceId: ChoiceId;
    optionId: string;
};
export type EventHandler = (event: SimulationEvent) => void;
/** Call to stop receiving events. */
export type Unsubscribe = () => void;
/** What the driver supplies to bring an entity into the world. */
export type SpawnSpec = {
    kind: EntityKind;
    position: Vec3;
    /** Optional caller-supplied id; the sim generates a stable one otherwise. */
    id?: EntityId;
    /** Opaque, echoed-but-never-read by the sim. */
    ref?: unknown;
    components?: EntityComponents;
};
/**
 * The surface the driver codes against. Split into three intents:
 *
 * - **commands** mutate the driver-owned slice / entity population (authoritative
 *   for spawn/forget/zones, advisory for intents),
 * - **queries** read authoritative current state (truth),
 * - **events** subscribe to the best-effort push stream (hints).
 *
 * A driver needs nothing else; it never touches Babylon or the render loop.
 */
export interface WorldApi {
    spawn(spec: SpawnSpec): EntityId;
    /** Remove an entity from the world. Symmetric with spawn; idempotent. */
    forget(id: EntityId): void;
    /** Set or (with null) clear advisory steering for an entity. */
    setIntent(id: EntityId, intent: EntityIntent | null): void;
    defineZone(id: ZoneId, zone: Zone): void;
    removeZone(id: ZoneId): void;
    getState(): Readonly<WorldState>;
    getEntity(id: EntityId): Readonly<WorldEntity> | undefined;
    query(predicate: (entity: Readonly<WorldEntity>) => boolean): WorldEntity[];
    subscribe(handler: EventHandler): Unsubscribe;
}
export type PlaceId = string;
export type PortalId = string;
export type ChoiceId = string;
/**
 * A place's QUALITATIVE shape — four adjectives; the sim DERIVES its geometry and
 * mechanics from them (the same move as `ease × score`: describe with adjectives,
 * compute the specifics). `dimensionality` is sim-internal — `discrete` is the
 * default and needs no coordinates; the finer values mean the sim keeps a private
 * coordinate frame that never crosses the membrane.
 */
export type Shape = {
    enclosure: 'open' | 'semi-open' | 'closed' | 'lockable';
    extent: 'intimate' | 'small' | 'medium' | 'large' | 'vast';
    dimensionality: 'discrete' | 'linear' | 'planar' | 'volumetric';
    structure: 'natural' | 'some-structures' | 'built' | 'enclosed';
};
/**
 * The distance ladder — the ONLY spatial quantity that crosses the membrane, and
 * it's an adjective (the spatial `ease × score`). Queried, never pushed (no
 * proximity events). Entity↔entity and INTRA-place only: across places is
 * `elsewhere`; "how far to a place" is topology (`route`), not a rung.
 */
export type Proximity = 'same-spot' | 'contact' | 'reach' | 'obvious' | 'noticeable' | 'present' | 'elsewhere';
export type PlaceKind = 'world' | 'region' | 'settlement' | 'building' | 'room' | 'place';
/** A node in the containment graph. `parent` gives the zoom path; `shape` derives the rest. */
export type Place = {
    id: PlaceId;
    kind: PlaceKind;
    parent?: PlaceId;
    label: string;
    shape: Shape;
};
/** An edge in the place graph — a door, gate, road. `cost` is coarse sim-seconds (feasibility is a graph sum, not `Vec3` maths). */
export type Portal = {
    id: PortalId;
    from: PlaceId;
    to: PlaceId;
    locked: boolean;
    label: string;
    cost: number;
};
/** An entity as the coordinate-free surface sees it: IN a place, with a label — no position. */
export type PlacedEntity = {
    id: EntityId;
    place: PlaceId;
    kind: EntityKind;
    label: string;
    /** Opaque, driver-owned; echoed, never interpreted. */
    ref?: unknown;
};
/** Relational placement — "in the study, near the table" — never a point. */
export type Anchor = {
    place: PlaceId;
    near?: EntityId;
    at?: Proximity;
};
/** Relational steering — "approach the butler" / "flee the wolf" — never a point. */
export type SteerTarget = {
    toPlace?: PlaceId;
    toEntity?: EntityId;
    behavior?: Behavior;
    fleeFrom?: EntityId;
};
/** A labelled set of options surfaced in-world (the "fight / flee" mid-air menu). The sim presents
 * and reports the pick (`choiceMade`); it NEVER resolves the choice — adjudication is the driver's. */
export type Choice = {
    id: ChoiceId;
    at: PlaceId | EntityId;
    options: {
        id: string;
        label: string;
    }[];
};
/**
 * The qualitative read-model of a place — labels + topology + proximity bands,
 * NEVER coordinates. Sim-computed (it has the geometry); the contract only fixes
 * the shape. It is both a debug instrument and the AI player's spatial sensorium.
 */
export type SchematicView = {
    place: {
        id: PlaceId;
        label: string;
        kind: PlaceKind;
        shape: Shape;
    };
    /** Containment breadcrumb, root → here. */
    path: {
        id: PlaceId;
        label: string;
    }[];
    exits: {
        portal: PortalId;
        label: string;
        to: PlaceId;
        toLabel: string;
        locked: boolean;
    }[];
    /** Everything in the place, each annotated with its rung relative to the `observer`. */
    contents: {
        id: EntityId;
        kind: EntityKind;
        label: string;
        proximity: Proximity;
    }[];
};
/**
 * The grown, coordinate-free surface. Extends `WorldApi` with the place graph, the
 * choice primitive, relational movement, and topology/quality reads. Implemented by
 * BOTH stores (Ariosto's reference `place-graph.ts` and, at `B-SIM-1`, tosijs-3d's
 * `WorldStore`); the shared conformance kit proves they behave identically.
 */
export interface MinSimApi extends WorldApi {
    definePlace(place: Place): void;
    definePortal(portal: Portal): void;
    placeEntity(spec: {
        id: EntityId;
        kind: EntityKind;
        label: string;
        ref?: unknown;
    }, at: Anchor): void;
    steer(id: EntityId, target: SteerTarget | null): void;
    /** Through a door/road → emits `placeEntered`. */
    traverse(id: EntityId, portal: PortalId): void;
    presentChoice(choice: Choice): void;
    placeOf(id: EntityId): PlaceId;
    contentsOf(place: PlaceId): PlacedEntity[];
    portalsOf(place: PlaceId): Portal[];
    /** Portal path + coarse cost between places; null when unreachable. Feasibility as a graph fact. */
    route(from: PlaceId, to: PlaceId): {
        portals: PortalId[];
        cost: number;
    } | null;
    /** A rung on the ladder — INTRA-place, entity↔entity; a quality, not a number. */
    proximity(a: EntityId, b: EntityId): Proximity;
    /** The qualitative read-model, proximities relative to `observer` (defaults to the player). */
    schematic(place: PlaceId, observer?: EntityId): SchematicView;
}
//# sourceMappingURL=world-contract.d.ts.map