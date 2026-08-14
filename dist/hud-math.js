/*#
# hud-math

Pure, dependency-free math for the aircraft HUD (see `static/aircraft-hud.svg`):
the Manta-style **radar trace** projection (track a target inside the HUD when it's
in the field of view, pin it to the periphery in its bearing direction when it's
outside/behind) and the **horizon/pitch-ladder** transform. Plain `{x,y,z}` /
quaternion objects (reuses [spatial-transform](?spatial-transform.ts)), so it
unit-tests headless like `fly-by-wire`; the SVG HUD renderer consumes the output.

## Example

Pure functions the [HUD driver](?hud.ts) / SVG renderer call — no scene of their own:

```javascript
import { hudTrace, horizonTransform } from 'tosijs-3d'

// hudTrace(viewer, targetWorldPos, opts) → where to draw a target on the HUD: it TRACKS the
// target while it's in the field of view, and PINS it to the periphery (in its bearing
// direction) when the target is outside the FOV or behind you — the Manta-style radar trace.
//
// horizonTransform(...) places the artificial-horizon line + pitch ladder for the current
// aircraft attitude. See <tosi-b3d-hud> for the live, assembled HUD.
```
*/
/*{ "parent": "Core" }*/
import { sub, rotateVector, quatConjugate, } from './spatial-transform';
/**
 * Rough centroid of an SVG path's coordinates → which side of the 256px HUD centre
 * (128,128) it sits on. Used to tag the four gauge arcs by side.
 */
export const sideFromD = (d) => {
    const n = (d.match(/-?\d*\.?\d+/g) ?? []).map(Number);
    let sx = 0;
    let sy = 0;
    let c = 0;
    for (let i = 0; i + 1 < n.length; i += 2) {
        sx += n[i];
        sy += n[i + 1];
        c++;
    }
    const cx = sx / c - 128;
    const cy = sy / c - 128;
    return Math.abs(cx) >= Math.abs(cy)
        ? cx < 0
            ? 'left'
            : 'right'
        : cy < 0
            ? 'top'
            : 'bottom';
};
/**
 * Project a world-space target into HUD space relative to a viewer pose (the
 * aircraft; +Z is the nose). Inside the FOV → a tracked position within `radius`;
 * outside or behind → pinned to the ring at `radius` in the target's bearing
 * direction (Manta-style: a target far off the right sits on the HUD's right edge).
 */
export function hudTrace(viewer, target, opts) {
    // Target direction in the viewer's local frame (+Z nose, +X right, +Y up).
    const rel = sub(target, viewer.position);
    const local = rotateVector(quatConjugate(viewer.rotation), rel);
    const distance = Math.hypot(local.x, local.y, local.z);
    const flat = Math.hypot(local.x, local.z);
    const azimuth = Math.atan2(local.x, local.z); // + = right of nose
    const elevation = Math.atan2(local.y, flat); // + = above nose
    const behind = local.z <= 0;
    const halfH = opts.fovH / 2;
    const halfV = opts.fovV / 2;
    // Normalised position within the FOV box (-1..1 at the FOV edges).
    const nx = azimuth / halfH;
    const ny = elevation / halfV;
    const inFov = !behind && Math.abs(nx) <= 1 && Math.abs(ny) <= 1;
    if (inFov) {
        // Tracked inside the ring. +y is DOWN in HUD space, so flip elevation.
        return {
            x: nx * opts.radius,
            y: -ny * opts.radius,
            tracked: true,
            behind: false,
            distance,
            azimuth,
            elevation,
        };
    }
    // Pinned to the periphery. Use the bearing direction; a target behind the wing
    // pins to the far left/right edge by the sign of its azimuth (it can't be "ahead").
    let dirX;
    let dirY;
    if (behind) {
        dirX = azimuth >= 0 ? 1 : -1;
        dirY = Math.max(-1, Math.min(1, ny)) * 0.001; // keep it near the horizontal edge
    }
    else {
        dirX = nx;
        dirY = ny;
    }
    const len = Math.hypot(dirX, dirY) || 1;
    const pin = opts.pinRadius ?? opts.radius;
    return {
        x: (dirX / len) * pin,
        y: (-dirY / len) * pin,
        tracked: false,
        behind,
        distance,
        azimuth,
        elevation,
    };
}
/**
 * Where a contact lands on the HUD, in viewBox coords, given NORMALISED surface coords
 * (`u`,`v` = -1..1 across the HUD, +u right, +v **up**). Inside the surface → `tracked`;
 * outside → **pinned** to the ring along that bearing.
 *
 * Shared by BOTH HUD projections (the cockpit quad and the flat overlay) so the two can't
 * drift apart. Note SVG's +y is DOWN, hence the flip.
 */
export function hudPointFromUV(u, v, opts) {
    const { center, pinRadius } = opts;
    if (Math.abs(u) <= 1 && Math.abs(v) <= 1) {
        return { x: center + u * center, y: center - v * center, tracked: true };
    }
    const len = Math.hypot(u, v) || 1;
    return {
        x: center + (u / len) * pinRadius,
        y: center - (v / len) * pinRadius,
        tracked: false,
    };
}
/**
 * How opaque a radar trace's FILL is: nothing at 0, ramping to **50%** at a full
 * `lockProgress`, and **75% once locked**.
 *
 * The ramp is the *acquiring* cue — a contact solidifies while you hold the nose on it,
 * and drains back when it slips the acquisition cone (the radar's lock decays, it isn't
 * instant). Without it the pilot gets no signal at all until the lock lands, and can't
 * make the decision the mechanic exists to force: stay on him, or break off.
 *
 * **What makes LOCK unmistakable is not this number** — it's that the OUTLINE goes white
 * and the fill switches from white to the FACTION colour (the renderer's business, in
 * `hud.ts`). The two channels trade jobs, so a locked trace never stops saying what it is,
 * and a lockable *neutral* would stay legible. Lock was once drawn as ONLY a denser fill
 * (50% → 75%, same colour) and was unreadable on a thin glyph at speed: a categorical
 * change was needed, not a darker shade.
 *
 * The 75% is worth having anyway, now that it isn't load-bearing: a 50% faction fill reads
 * washed-out inside a white outline.
 */
export function lockFillOpacity(lockProgress, locked) {
    if (locked === true)
        return 0.75; // bold faction fill, inside the white outline
    if (!(lockProgress > 0))
        return 0; // also catches NaN
    return Math.min(1, lockProgress) * 0.5;
}
/**
 * The cockpit HUD is a real quad — a combiner glass. Given the EYE and the TARGET
 * expressed in that quad's LOCAL space (where the glass is the `z = 0` square spanning
 * ±`half`), return where the **eye→target ray crosses the glass**, as normalised -1..1
 * coords. Null when it can't: the ray runs parallel to the glass, or the crossing is
 * behind the eye.
 *
 * This is the whole trick behind the HUD: because it's plain geometry against the quad's
 * own frame, there's no projection matrix, no FOV and no handedness to get wrong — so it
 * CANNOT disagree with what the renderer draws through that glass. (The previous
 * approach re-derived the camera projection by hand and never lined up.)
 */
export function glassUV(eyeLocal, targetLocal, half) {
    if (!(half > 0))
        return null;
    const dz = targetLocal.z - eyeLocal.z;
    if (Math.abs(dz) < 1e-6)
        return null; // parallel to the glass
    const t = -eyeLocal.z / dz; // param where the ray crosses z = 0
    if (t <= 0)
        return null; // glass is behind us relative to the target
    return {
        u: (eyeLocal.x + t * (targetLocal.x - eyeLocal.x)) / half,
        v: (eyeLocal.y + t * (targetLocal.y - eyeLocal.y)) / half,
    };
}
/**
 * Pitch-ladder transform for the HUD horizon. The ladder is drawn as if painted on
 * the world horizon: pitching UP slides the rungs DOWN by `pxPerDeg` per degree, and
 * the whole ladder counter-rotates by the roll so the horizon reads level.
 */
export function horizonTransform(pitchDeg, rollDeg, pxPerDeg) {
    return { offsetY: pitchDeg * pxPerDeg, rollDeg: -rollDeg };
}
/**
 * Light one or more SPANS along a single path, as a `stroke-dasharray`.
 *
 * An SVG path with `pathLength` set is a ruler you can draw on: alternating
 * gap/dash pairs light exactly the ranges you name, so ONE arc can carry a
 * fill, a set-point notch, a redline band and a ground reference without four
 * copies of the geometry to keep aligned. That's the trick the meter marks
 * use, generalised — bars and notches are the same thing at different widths.
 *
 * Spans are `[from, to]` in 0..1 along the path; they're clamped, sorted and
 * merged, so overlapping input can't produce a corrupt array.
 */
export function arcDashArray(spans, total = 1000) {
    const unit = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
    const clean = spans
        .map(([a, b]) => [unit(Math.min(a, b)), unit(Math.max(a, b))])
        .filter(([a, b]) => b > a)
        .sort((x, y) => x[0] - y[0]);
    const merged = [];
    for (const [a, b] of clean) {
        const last = merged[merged.length - 1];
        if (last != null && a <= last[1])
            last[1] = Math.max(last[1], b);
        else
            merged.push([a, b]);
    }
    // A dasharray starts with a DASH, so lead with a zero-length one to make the
    // first entry a gap.
    // Rounded: these land in a DOM attribute, and 300.00000000000006 is noise
    // that makes a dasharray unreadable in devtools for no benefit.
    const round = (v) => Math.round(v * 1000) / 1000;
    const parts = [0];
    let cursor = 0;
    for (const [a, b] of merged) {
        parts.push(round((a - cursor) * total), round((b - a) * total));
        cursor = b;
    }
    parts.push(round((1 - cursor) * total));
    return parts.join(' ');
}
//# sourceMappingURL=hud-math.js.map