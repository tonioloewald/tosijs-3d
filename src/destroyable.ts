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
import {
  type Resource,
  makeResource,
  drain,
  refill,
  regenTick,
} from './resource.js'

/** Default seconds before a chain link fires after its source is destroyed. */
export const DEFAULT_CHAIN_DELAY = 0.25

/** A directed on-destruction link: when the source dies, damage `target`. */
export interface ChainLink {
  target: string
  amount: number
  /** Seconds after the source's destruction; default 0.25. */
  delay?: number
}

export interface DestroyableSpec {
  capacity: number
  /** Health regen per second; default 0 (no regen). */
  regenRate?: number
  /** Regen delay in seconds; default 0.5. */
  regenDelay?: number
  /** Flat damage shrugged off every hit; default 0. */
  armor?: number
  /** Id of a protector; while it is intact, incoming damage is reduced. */
  protectedBy?: string
  /** Flat reduction applied while the protector is intact; default 0. */
  protection?: number
  /** On-destruction chain links (one-to-many; cascades). */
  chain?: ChainLink[]
}

export interface Destroyable {
  id: string
  hp: Resource
  armor: number
  protectedBy: string | null
  protection: number
  chain: ChainLink[]
  destroyed: boolean
  /**
   * Why this died. Set once, at the moment it is destroyed.
   *
   * The world remembers it because the DEATH and the OBSERVER are separated in
   * time: a chain reaction resolves inside `tick`, and the scene layer notices
   * by polling `destroyed` on the next frame — so by the time anything reacts,
   * the event carrying the cause has already been consumed. Storing it here is
   * what lets a reaction ask "and who did this?" without the caller having to
   * thread the event stream through to every observer.
   */
  cause?: Cause
}

/**
 * Who caused this, and how it reached them.
 *
 * Requested by manta-recon (#8), whose mission layer resolves to a LEDGER OF
 * WORLD FACTS rather than a score — and a fact without causality drives no
 * consequence. The engine makes attribution genuinely hard in exactly the
 * interesting cases: `deathBlast` cascades emergently, chain links transfer
 * damage after a delay, and there is no friendly-fire exemption, so one bomb
 * can produce a destruction three hops away. Without provenance a game either
 * cannot credit the player for a spectacular cascade or blames them for one
 * they could not foresee, and both are worse than the truth.
 */
export interface Cause {
  /**
   * Who is RESPONSIBLE — the originator, however many hops back.
   *
   * Deliberately not "what hit it". A cascade that starts with the player's
   * bomb is the player's cascade, and re-attributing each hop to the drum that
   * happened to be next would launder the credit away.
   */
  by?: string
  /** How this particular hit arrived. */
  kind?: 'direct' | 'blast' | 'chain' | 'collision'
  /** The IMMEDIATE link in a cascade — the drum that went up next door. */
  via?: string
  /**
   * Hops from the originating act. `0` is a direct hit.
   *
   * A count rather than a list of every hop, which is what keeps this bounded
   * without needing a depth cap: the chain already terminates (each entity is
   * destroyed once, and the destroyed-guard stops loops), so nothing here can
   * grow. A consumer that wants the full path can reconstruct it from the
   * event stream, which it has in order.
   */
  hops?: number
}

export type CombatEvent =
  | {
      type: 'damaged'
      id: string
      amount: number
      hp: number
      cause?: Cause
    }
  | { type: 'destroyed'; id: string; cause?: Cause }

interface PendingChain {
  at: number
  link: ChainLink
  sourceId: string
  cause?: Cause
}

export class CombatWorld {
  private map = new Map<string, Destroyable>()
  private pending: PendingChain[] = []
  private now = 0

  /** Add (or replace) a Destroyable by id. Returns its state. */
  add(id: string, spec: DestroyableSpec): Destroyable {
    const d: Destroyable = {
      id,
      hp: makeResource({
        max: spec.capacity,
        regenRate: spec.regenRate ?? 0,
        regenDelay: spec.regenDelay ?? 0.5,
      }),
      armor: spec.armor ?? 0,
      protectedBy: spec.protectedBy ?? null,
      protection: spec.protection ?? 0,
      chain: spec.chain ?? [],
      destroyed: false,
    }
    this.map.set(id, d)
    return d
  }

  remove(id: string): void {
    this.map.delete(id)
  }

  get(id: string): Destroyable | undefined {
    return this.map.get(id)
  }

  /** Intact = exists and not destroyed (the protector-intact test). */
  isIntact(id: string): boolean {
    const d = this.map.get(id)
    return d != null && !d.destroyed
  }

  /** Heal a Destroyable (external repair). No-op if unknown/destroyed. */
  heal(id: string, amount: number): void {
    const d = this.map.get(id)
    if (d == null || d.destroyed) return
    refill(d.hp, amount)
  }

  /**
   * Apply a damage packet to `id`, resolving protection → armor → capacity. If the
   * hit destroys it, schedule its chain link(s). Returns the events produced by
   * THIS call (a `damaged` or `destroyed`); chain detonations surface later from
   * `tick`. Pushes onto `out` if given (so callers can accumulate across a frame).
   */
  applyDamage(
    id: string,
    amount: number,
    out: CombatEvent[] = [],
    cause?: Cause
  ): CombatEvent[] {
    const d = this.map.get(id)
    if (d == null || d.destroyed || amount <= 0) return out

    let dmg = amount
    // Protection: flat reduction while the protector is intact; it vanishes (it is
    // NOT dealt to the protector).
    if (d.protectedBy != null && this.isIntact(d.protectedBy)) {
      dmg -= d.protection
    }
    // Armor: flat shrug-off.
    dmg -= d.armor
    if (dmg <= 0) return out // fully absorbed — no state change, no event

    drain(d.hp, dmg)
    if (d.hp.value <= 0) {
      d.destroyed = true
      if (cause != null) d.cause = cause
      /*
      THE ORIGINATOR SURVIVES THE HOP; the immediate link is recorded beside it.

      `by` keeps whoever started this — so a drum that goes up because the
      player's bomb got its neighbour is still attributed to the player — while
      `via` names the neighbour and `hops` counts the distance. Re-attributing
      each hop to the thing next to it would launder the credit away, which is
      the whole failure #8 describes.
      */
      const onward: Cause | undefined =
        cause == null && d.chain.length === 0
          ? undefined
          : {
              by: cause?.by,
              kind: 'chain',
              via: id,
              hops: (cause?.hops ?? 0) + 1,
            }
      for (const link of d.chain) {
        this.pending.push({
          at: this.now + (link.delay ?? DEFAULT_CHAIN_DELAY),
          link,
          sourceId: id,
          cause: onward,
        })
      }
      out.push(
        cause == null
          ? { type: 'destroyed', id }
          : { type: 'destroyed', id, cause }
      )
    } else {
      out.push(
        cause == null
          ? { type: 'damaged', id, amount: dmg, hp: d.hp.value }
          : { type: 'damaged', id, amount: dmg, hp: d.hp.value, cause }
      )
    }
    return out
  }

  /**
   * Advance time by `dt`: regenerate living Destroyables, then fire any chain links
   * now due (which apply damage and can cascade — a chain that destroys its target
   * fires that target's links too, guarded against loops by the `destroyed` flag).
   * Returns all events produced.
   */
  tick(dt: number, out: CombatEvent[] = []): CombatEvent[] {
    this.now += dt
    for (const d of this.map.values()) {
      if (!d.destroyed) regenTick(d.hp, dt)
    }
    // Fire due links. Cascades push new pending entries at now+delay; with the
    // default delay > 0 they land in a later tick, and the destroyed-guard stops
    // any loop, so this terminates.
    let i = 0
    while (i < this.pending.length) {
      const p = this.pending[i]
      if (p.at <= this.now) {
        this.pending.splice(i, 1)
        this.applyDamage(p.link.target, p.link.amount, out, p.cause)
      } else {
        i++
      }
    }
    return out
  }
}
