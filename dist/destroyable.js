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
import { makeResource, drain, refill, regenTick, } from './resource.js';
/** Default seconds before a chain link fires after its source is destroyed. */
export const DEFAULT_CHAIN_DELAY = 0.25;
export class CombatWorld {
    map = new Map();
    pending = [];
    now = 0;
    /** Add (or replace) a Destroyable by id. Returns its state. */
    add(id, spec) {
        const d = {
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
        };
        this.map.set(id, d);
        return d;
    }
    remove(id) {
        this.map.delete(id);
    }
    get(id) {
        return this.map.get(id);
    }
    /** Intact = exists and not destroyed (the protector-intact test). */
    isIntact(id) {
        const d = this.map.get(id);
        return d != null && !d.destroyed;
    }
    /** Heal a Destroyable (external repair). No-op if unknown/destroyed. */
    heal(id, amount) {
        const d = this.map.get(id);
        if (d == null || d.destroyed)
            return;
        refill(d.hp, amount);
    }
    /**
     * Apply a damage packet to `id`, resolving protection → armor → capacity. If the
     * hit destroys it, schedule its chain link(s). Returns the events produced by
     * THIS call (a `damaged` or `destroyed`); chain detonations surface later from
     * `tick`. Pushes onto `out` if given (so callers can accumulate across a frame).
     */
    applyDamage(id, amount, out = []) {
        const d = this.map.get(id);
        if (d == null || d.destroyed || amount <= 0)
            return out;
        let dmg = amount;
        // Protection: flat reduction while the protector is intact; it vanishes (it is
        // NOT dealt to the protector).
        if (d.protectedBy != null && this.isIntact(d.protectedBy)) {
            dmg -= d.protection;
        }
        // Armor: flat shrug-off.
        dmg -= d.armor;
        if (dmg <= 0)
            return out; // fully absorbed — no state change, no event
        drain(d.hp, dmg);
        if (d.hp.value <= 0) {
            d.destroyed = true;
            for (const link of d.chain) {
                this.pending.push({
                    at: this.now + (link.delay ?? DEFAULT_CHAIN_DELAY),
                    link,
                    sourceId: id,
                });
            }
            out.push({ type: 'destroyed', id });
        }
        else {
            out.push({ type: 'damaged', id, amount: dmg, hp: d.hp.value });
        }
        return out;
    }
    /**
     * Advance time by `dt`: regenerate living Destroyables, then fire any chain links
     * now due (which apply damage and can cascade — a chain that destroys its target
     * fires that target's links too, guarded against loops by the `destroyed` flag).
     * Returns all events produced.
     */
    tick(dt, out = []) {
        this.now += dt;
        for (const d of this.map.values()) {
            if (!d.destroyed)
                regenTick(d.hp, dt);
        }
        // Fire due links. Cascades push new pending entries at now+delay; with the
        // default delay > 0 they land in a later tick, and the destroyed-guard stops
        // any loop, so this terminates.
        let i = 0;
        while (i < this.pending.length) {
            const p = this.pending[i];
            if (p.at <= this.now) {
                this.pending.splice(i, 1);
                this.applyDamage(p.link.target, p.link.amount, out);
            }
            else {
                i++;
            }
        }
        return out;
    }
}
//# sourceMappingURL=destroyable.js.map