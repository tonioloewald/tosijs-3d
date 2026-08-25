/*#
# dialog-placement

**Where a modal dialog goes, and when it should follow you** — the pure half of
world-placed dialogs. Babylon-free (plain `{x, y, z}`), deterministic, and unit
tested, so the rules can be argued about without a headset.

## Why dialogs are world-placed at all

A camera-parented panel is the obvious implementation and the wrong one. In 2D a
DOM element is clipped to its window, and `z-index` is a *local* claim that
cannot lift you out of an `overflow: hidden` ancestor. **Depth and collision are
XR's window frame**: you do not get to composite over them. A respawn panel set
to draw on top painted in front of the terrain and became untouchable, because
picking is geometric and does not care what you drew last.

So a dialog is a thing at a place. It occludes and is occluded like anything
else, it stacks with other UI by ordinary depth, and it does not jitter with
your head.

## Why it still follows you

The one honest argument for head-locking is "what if I cannot find it". Answer:
if the dialog has been outside a generous cone for a couple of seconds, it
re-picks a spot in front of you and eases over. You get findability without the
panel chasing your eyes — the thing that made a face-pinned pause dialog
unpleasant.

**Eased, never snapped.** A dialog that teleports reads as a glitch; one that
moves reads as deliberate.
*/
/*{ "parent": "UI" }*/
const sub = (a, b) => ({
    x: a.x - b.x,
    y: a.y - b.y,
    z: a.z - b.z,
});
const len = (v) => Math.hypot(v.x, v.y, v.z);
/** Unit vector, or `null` for a zero-length input (which has no direction). */
export function normalize(v) {
    const l = len(v);
    if (l < 1e-9)
        return null;
    return { x: v.x / l, y: v.y / l, z: v.z / l };
}
/**
 * Angle in DEGREES between where the viewer looks and where the dialog is.
 *
 * Returns `0` when the dialog is exactly on the view axis and `180` when it is
 * directly behind. A dialog at the viewer's own position has no direction, and
 * is reported as `0` — on-axis — because "you are inside it" is not a reason to
 * go and fetch it.
 */
export function gazeOffAxisDeg(eye, forward, dialog) {
    const f = normalize(forward);
    const d = normalize(sub(dialog, eye));
    if (f == null || d == null)
        return 0;
    const dot = Math.max(-1, Math.min(1, f.x * d.x + f.y * d.y + f.z * d.z));
    return (Math.acos(dot) * 180) / Math.PI;
}
export const newGazeState = () => ({ offAxisSec: 0 });
/**
 * Advance the look-away clock and say whether the dialog should re-place.
 *
 * The clock **resets** the moment the dialog is back inside the cone, so a
 * glance away costs nothing — only sustained inattention moves it. Returns the
 * next state alongside the decision rather than mutating, so the rule is
 * testable and the caller owns the state.
 */
export function gazeStep(state, offAxisDeg, dt, opts = {}) {
    const { coneDeg = 55, holdSec = 2 } = opts;
    if (offAxisDeg <= coneDeg)
        return { state: { offAxisSec: 0 }, recover: false };
    const offAxisSec = state.offAxisSec + Math.max(0, dt);
    if (offAxisSec >= holdSec)
        return { state: { offAxisSec: 0 }, recover: true };
    return { state: { offAxisSec }, recover: false };
}
/**
 * Pick the best of several candidate distances — the results of casting a ray
 * along each candidate direction.
 *
 * `Infinity` means nothing was hit, i.e. fully clear. The winner is the
 * candidate with the most room, preferring EARLIER candidates on a tie so a
 * caller can order them by desirability (straight ahead first). Returns `-1`
 * when every candidate is too cramped to use.
 */
export function bestCandidate(clearances, minClearance) {
    let best = -1;
    let bestClear = -Infinity;
    for (let i = 0; i < clearances.length; i++) {
        const c = clearances[i];
        if (c < minClearance)
            continue;
        if (c > bestClear) {
            best = i;
            bestClear = c;
        }
    }
    return best;
}
/**
 * How far along a candidate direction to actually sit.
 *
 * Short of the obstruction by `margin` so the panel is not coplanar with a wall,
 * never past the distance you asked for, and never closer than `minZ` — a panel
 * at arm's length is uncomfortable in a headset, which is why "just use the near
 * clip plane" is the wrong version of this idea.
 */
export function placementDistance(clearance, desired, minZ = 0.6, margin = 0.25) {
    const room = clearance === Infinity ? desired : clearance - margin;
    return Math.max(minZ, Math.min(desired, room));
}
/**
 * Ease a position toward a target — frame-rate independent.
 *
 * `smoothing` is the fraction of the remaining distance left after one second,
 * so the result does not change when the frame rate does (the naive
 * `lerp(a, b, 0.1)` per frame moves twice as fast at 120fps as at 60).
 */
export function easeTo(current, target, dt, smoothing = 0.001) {
    const t = 1 - Math.pow(smoothing, Math.max(0, dt));
    return {
        x: current.x + (target.x - current.x) * t,
        y: current.y + (target.y - current.y) * t,
        z: current.z + (target.z - current.z) * t,
    };
}
//# sourceMappingURL=dialog-placement.js.map