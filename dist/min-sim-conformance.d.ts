import type { MinSimApi } from './world-contract';
/** The slice of a Jest/bun-style test runner the kit needs. Kept minimal + loose so any runner fits. */
export type ConformanceHarness = {
    describe: (name: string, fn: () => void) => void;
    test: (name: string, fn: () => void) => void;
    expect: (actual: any) => any;
};
/**
 * A store the kit can advance. `tick` is NOT part of `MinSimApi` (it's the engine's clock, not a
 * driver command), but the kit needs it to test that steering resolves over time — and every
 * conformant store has one (determinism rule: time only via `tick`, no `Date.now`).
 */
export type TickableMinSim = MinSimApi & {
    tick(deltaSeconds: number): void;
};
/**
 * Run the MinSimApi conformance suite against `makeApi()`, using the caller's test harness. Every
 * assertion is a contract behaviour a compliant store MUST honour — no coordinates asserted.
 */
export declare function runMinSimConformance(makeApi: () => TickableMinSim, { describe, test, expect }: ConformanceHarness): void;
//# sourceMappingURL=min-sim-conformance.d.ts.map