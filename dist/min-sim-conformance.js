/*#
# min-sim-conformance

**One contract, two stores.** The coordinate-free `MinSimApi` ([world-contract](?world-contract.ts) §8)
is implemented by BOTH Ariosto's reference store and tosijs-3d's [world-store](?world-store.ts). This
is the shared kit that proves they behave identically — the "conformance" half of the contract
package (the agreement at the seam: *the package is types + conformance kit, not a store*).

It is **framework-agnostic**: it imports no test runner (so it can ship in the library), and takes
the harness (`describe`/`test`/`expect`) as an argument. A `.test.ts` in either repo passes in its
own `bun:test` hooks and a factory for its store:

```javascript
import { runMinSimConformance } from 'tosijs-3d'
import { describe, test, expect } from 'bun:test'
import { WorldStore } from 'tosijs-3d'
// runMinSimConformance(() => new WorldStore(), { describe, test, expect })
```

What it pins is the **contract behaviour**, not the geometry: place membership, portal routing
(cheapest, bidirectional, locked = impassable), the proximity ladder (a rung in-place, `elsewhere`
across places), the `SchematicView` shape, `traverse` → `placeEntered`, and that steering toward an
entity actually *closes the distance*. It never asserts a coordinate — coordinates never cross.
*/
/*{ "parent": "World-Sim", "order": 900 }*/
const room = (id, label, parent, extent = 'small') => ({
    id,
    kind: 'room',
    parent,
    label,
    shape: {
        enclosure: 'closed',
        extent,
        dimensionality: 'planar',
        structure: 'built',
    },
});
const door = (id, from, to, cost, locked = false) => ({ id, from, to, locked, label: id, cost });
/**
 * Stage a small mystery-manor graph on a fresh store and return it. Shared fixture for every case:
 *
 *   world ─ manor ─ { study, hall, garden }
 *   study ─door─ hall ─frenchDoors─ garden ;  study ─window(LOCKED)─ garden
 *   player + butler in the study (butler at `reach`) ; wolf in the garden
 */
function stage(api) {
    api.definePlace({
        id: 'world',
        kind: 'world',
        label: 'The World',
        shape: {
            enclosure: 'open',
            extent: 'vast',
            dimensionality: 'planar',
            structure: 'natural',
        },
    });
    api.definePlace({
        id: 'manor',
        kind: 'building',
        parent: 'world',
        label: 'Blackwood Manor',
        shape: {
            enclosure: 'closed',
            extent: 'large',
            dimensionality: 'volumetric',
            structure: 'built',
        },
    });
    api.definePlace(room('study', 'The Study', 'manor'));
    api.definePlace(room('hall', 'The Hall', 'manor'));
    api.definePlace({
        id: 'garden',
        kind: 'place',
        parent: 'manor',
        label: 'The Garden',
        shape: {
            enclosure: 'open',
            extent: 'medium',
            dimensionality: 'planar',
            structure: 'natural',
        },
    });
    api.definePortal(door('door', 'study', 'hall', 3));
    api.definePortal(door('frenchDoors', 'hall', 'garden', 5));
    api.definePortal(door('window', 'study', 'garden', 1, true)); // locked shortcut
    // the player entity already exists (WorldApi seeds it); place it in the study
    api.placeEntity({ id: 'player', kind: 'player', label: 'You' }, { place: 'study' });
    api.placeEntity({ id: 'butler', kind: 'npc', label: 'The Butler' }, { place: 'study', near: 'player', at: 'reach' });
    api.placeEntity({ id: 'wolf', kind: 'npc', label: 'A Wolf' }, { place: 'garden' });
}
/**
 * Run the MinSimApi conformance suite against `makeApi()`, using the caller's test harness. Every
 * assertion is a contract behaviour a compliant store MUST honour — no coordinates asserted.
 */
export function runMinSimConformance(makeApi, { describe, test, expect }) {
    describe('MinSimApi conformance', () => {
        test('membership: placeEntity → placeOf + contentsOf', () => {
            const api = makeApi();
            stage(api);
            expect(api.placeOf('player')).toBe('study');
            expect(api.placeOf('butler')).toBe('study');
            expect(api.placeOf('wolf')).toBe('garden');
            const study = api
                .contentsOf('study')
                .map((e) => e.id)
                .sort();
            expect(study).toEqual(['butler', 'player']);
            expect(api.contentsOf('garden').map((e) => e.id)).toEqual(['wolf']);
            // labels + kinds survive the round-trip
            const butler = api.contentsOf('study').find((e) => e.id === 'butler');
            expect(butler?.label).toBe('The Butler');
            expect(butler?.kind).toBe('npc');
        });
        test('portals: portalsOf both endpoints', () => {
            const api = makeApi();
            stage(api);
            expect(api
                .portalsOf('study')
                .map((p) => p.id)
                .sort()).toEqual(['door', 'window']);
            expect(api
                .portalsOf('garden')
                .map((p) => p.id)
                .sort()).toEqual(['frenchDoors', 'window']);
        });
        test('route: cheapest path, bidirectional, LOCKED portal impassable', () => {
            const api = makeApi();
            stage(api);
            // study→garden must go the long way (door+frenchDoors, cost 8) — the cost-1 window is LOCKED
            const r = api.route('study', 'garden');
            expect(r).not.toBeNull();
            expect(r?.portals).toEqual(['door', 'frenchDoors']);
            expect(r?.cost).toBe(8);
            // bidirectional
            expect(api.route('garden', 'study')?.cost).toBe(8);
            // same place → empty, zero
            expect(api.route('study', 'study')).toEqual({ portals: [], cost: 0 });
            // unreachable → null
            expect(api.route('study', 'atlantis')).toBeNull();
        });
        test('proximity: a rung in-place, elsewhere across places', () => {
            const api = makeApi();
            stage(api);
            // butler was placed at `reach` of the player → the rung round-trips back
            expect(api.proximity('player', 'butler')).toBe('reach');
            // an entity vs itself is same-spot
            expect(api.proximity('player', 'player')).toBe('same-spot');
            // different places → elsewhere, never a rung
            expect(api.proximity('player', 'wolf')).toBe('elsewhere');
        });
        test('schematic: identity, breadcrumb, exits, contents-with-rung', () => {
            const api = makeApi();
            stage(api);
            const view = api.schematic('study');
            expect(view.place.id).toBe('study');
            expect(view.place.label).toBe('The Study');
            expect(view.place.shape.extent).toBe('small');
            // containment breadcrumb, root → here
            expect(view.path.map((p) => p.id)).toEqual(['world', 'manor', 'study']);
            // exits carry the destination + locked flag
            const window = view.exits.find((e) => e.portal === 'window');
            expect(window?.to).toBe('garden');
            expect(window?.toLabel).toBe('The Garden');
            expect(window?.locked).toBe(true);
            // contents ranked relative to the observer (defaults to the player)
            const you = view.contents.find((c) => c.id === 'player');
            const butler = view.contents.find((c) => c.id === 'butler');
            expect(you?.proximity).toBe('same-spot');
            expect(butler?.proximity).toBe('reach');
        });
        test('traverse: changes place + emits placeEntered', () => {
            const api = makeApi();
            stage(api);
            const seen = [];
            api.subscribe((e) => seen.push(e));
            api.traverse('player', 'door'); // study → hall
            expect(api.placeOf('player')).toBe('hall');
            const entered = seen.find((e) => e.type === 'placeEntered');
            expect(entered).toBeDefined();
            expect(entered.placeId).toBe('hall');
            // a LOCKED portal is a no-op
            api.placeEntity({ id: 'ghost', kind: 'npc', label: 'Ghost' }, { place: 'study' });
            api.traverse('ghost', 'window'); // locked → stays put
            expect(api.placeOf('ghost')).toBe('study');
        });
        test('steer toward an entity closes the distance over ticks', () => {
            const api = makeApi();
            stage(api);
            // wolf and player in the garden, far apart; steer the wolf to approach → proximity tightens
            api.traverse('player', 'door'); // study → hall
            api.traverse('player', 'frenchDoors'); // hall → garden (now with the wolf)
            // place them far: put a second entity at `noticeable`
            api.placeEntity({ id: 'stranger', kind: 'npc', label: 'Stranger' }, { place: 'garden', near: 'player', at: 'noticeable' });
            const before = api.proximity('player', 'stranger');
            api.steer('stranger', { toEntity: 'player' });
            for (let i = 0; i < 200; i++)
                api.tick(0.1); // ~20s of approach
            const after = api.proximity('player', 'stranger');
            const order = [
                'elsewhere',
                'present',
                'noticeable',
                'obvious',
                'reach',
                'contact',
                'same-spot',
            ];
            // 'after' must be at least as CLOSE as 'before' (higher index = closer)
            expect(order.indexOf(after)).toBeGreaterThanOrEqual(order.indexOf(before));
            // and it should have genuinely closed in (not merely held)
            expect(['contact', 'same-spot', 'reach']).toContain(after);
            // steering off leaves it put
            api.steer('stranger', null);
        });
    });
}
//# sourceMappingURL=min-sim-conformance.js.map