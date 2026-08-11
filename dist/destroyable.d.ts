/**
 * Pure, Babylon-free, deterministic combat state — the sink every warhead resolves
 * against (see COMBAT-DESIGN.md). A `CombatWorld` holds Destroyables by id and
 * resolves damage, flat armor, flat protection (from an intact protector), regen,
 * and cascading chain reactions. It imports no 3D engine, so a Babylon scene is a
 * *view* of it and the whole thing is unit-testable.
 *
 * Determinism: ids are caller-supplied, time advances only via `tick(dt)`, and
 * chain reactions fire off a scheduled queue — no Date.now / Math.random. Same
 * inputs → same trace.
 *
 * Damage pipeline per packet (shield is handled spatially, outside this model — a
 * shield is just another Destroyable that gets hit first):
 *   protection (flat, if protector intact, vanishes) → armor (flat) → capacity.
 * On destruction: schedule chain link(s), then fire them (with their delay) via
 * `tick` — cascading through whatever they destroy.
 */
import { type Resource } from './resource';
/** Default seconds before a chain link fires after its source is destroyed. */
export declare const DEFAULT_CHAIN_DELAY = 0.25;
/** A directed on-destruction link: when the source dies, damage `target`. */
export interface ChainLink {
    target: string;
    amount: number;
    /** Seconds after the source's destruction; default 0.25. */
    delay?: number;
}
export interface DestroyableSpec {
    capacity: number;
    /** Health regen per second; default 0 (no regen). */
    regenRate?: number;
    /** Regen delay in seconds; default 0.5. */
    regenDelay?: number;
    /** Flat damage shrugged off every hit; default 0. */
    armor?: number;
    /** Id of a protector; while it is intact, incoming damage is reduced. */
    protectedBy?: string;
    /** Flat reduction applied while the protector is intact; default 0. */
    protection?: number;
    /** On-destruction chain links (one-to-many; cascades). */
    chain?: ChainLink[];
}
export interface Destroyable {
    id: string;
    hp: Resource;
    armor: number;
    protectedBy: string | null;
    protection: number;
    chain: ChainLink[];
    destroyed: boolean;
}
export type CombatEvent = {
    type: 'damaged';
    id: string;
    amount: number;
    hp: number;
} | {
    type: 'destroyed';
    id: string;
};
export declare class CombatWorld {
    private map;
    private pending;
    private now;
    /** Add (or replace) a Destroyable by id. Returns its state. */
    add(id: string, spec: DestroyableSpec): Destroyable;
    remove(id: string): void;
    get(id: string): Destroyable | undefined;
    /** Intact = exists and not destroyed (the protector-intact test). */
    isIntact(id: string): boolean;
    /** Heal a Destroyable (external repair). No-op if unknown/destroyed. */
    heal(id: string, amount: number): void;
    /**
     * Apply a damage packet to `id`, resolving protection → armor → capacity. If the
     * hit destroys it, schedule its chain link(s). Returns the events produced by
     * THIS call (a `damaged` or `destroyed`); chain detonations surface later from
     * `tick`. Pushes onto `out` if given (so callers can accumulate across a frame).
     */
    applyDamage(id: string, amount: number, out?: CombatEvent[]): CombatEvent[];
    /**
     * Advance time by `dt`: regenerate living Destroyables, then fire any chain links
     * now due (which apply damage and can cascade — a chain that destroys its target
     * fires that target's links too, guarded against loops by the `destroyed` flag).
     * Returns all events produced.
     */
    tick(dt: number, out?: CombatEvent[]): CombatEvent[];
}
//# sourceMappingURL=destroyable.d.ts.map