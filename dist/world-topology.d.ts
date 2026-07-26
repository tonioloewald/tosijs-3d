import type { PlaceId, PortalId, Portal, Place, Proximity, Shape } from './world-contract';
/**
 * Map a sim-private distance to a rung on the qualitative ladder — the ONE spatial value that
 * crosses the contract, and it's an adjective. Bands scale with the place `extent`. Returns at most
 * `present` (still IN the place, just far); `elsewhere` means a DIFFERENT place and is the caller's
 * job (two entities not in the same place are `elsewhere`, full stop).
 */
export declare function proximityRung(distance: number, extent?: Shape['extent']): Exclude<Proximity, 'elsewhere'>;
/**
 * The inverse of `proximityRung` for PLACEMENT: a representative sim-private distance for a rung,
 * so "put the butler at `reach` of the desk" becomes a real offset the sim can lay out. Lands inside
 * the rung's band (round-trips back through `proximityRung`). `elsewhere` has no distance — that's a
 * different place, not a rung — so it's excluded from the input type.
 */
export declare function rungNominal(rung: Exclude<Proximity, 'elsewhere'>, extent?: Shape['extent']): number;
/**
 * Cheapest portal path from `from` to `to`, or `null` if unreachable. Portals are **bidirectional**
 * (a door connects two places both ways) and **locked portals are skipped** — the route is what's
 * traversable now, so a locked door makes a place unreachable until it opens (that's the errand's
 * feasibility becoming a graph fact). `cost` is the sum of the coarse per-portal costs; the returned
 * `portals` are in traversal order. Deterministic: ties broken by portal id so the same graph always
 * yields the same path.
 */
export declare function routePortals(portals: Portal[], from: PlaceId, to: PlaceId): {
    portals: PortalId[];
    cost: number;
} | null;
/**
 * The containment breadcrumb root→here: walk the `parent` chain up from `placeId` and reverse. Stops
 * safely on a missing parent or a cycle (defensive — a malformed graph shouldn't hang the sim).
 */
export declare function containmentPath(places: Map<PlaceId, Place>, placeId: PlaceId): {
    id: PlaceId;
    label: string;
}[];
//# sourceMappingURL=world-topology.d.ts.map