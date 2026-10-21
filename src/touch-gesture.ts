/*
# touch-gesture

**Two fingers on an orbit camera: pan OR zoom, decided once per gesture.**
Pure — no Babylon, no DOM — so the decision is tested without a touchscreen.

The map every consumer gets (tosijs-3d#52):

| fingers                  | does  |
| ------------------------ | ----- |
| one                      | orbit |
| two, moving together     | pan   |
| two, spreading / closing | zoom  |

## Why not Babylon's own

Babylon's `ArcRotateCamera` does BOTH on every two-finger move by default
(`multiTouchPanAndZoom`), with zoom driven by the change in SQUARED finger
distance. Real fingers never keep their spacing exactly, so a two-finger drag
reads mostly as zoom, which was the report: _"two finger drag is just a weird zoom"_.

Its alternative mode (`multiTouchPanAndZoom = false`) calls a gesture a pinch
only if the spacing jumps more than `pinchToPanMaxDistance` pixels IN ONE
EVENT during its first 20 events. So a slow, deliberate pinch becomes a pan for
good, which is how the consumer's attempt to switch to it broke pinch-to-zoom.

## The rule here

Compare how far the fingers have SPREAD (net change in spacing since the
gesture began) with how far their centroid has TRAVELLED (net, likewise), until
the two together pass `decidePx`. Then lock: whichever is larger wins for the
rest of the gesture. NET, not summed per event: real fingers jitter, and summed
jitter reads as spreading. The first version summed, and a drag with a few
pixels of wobble per event came out as a zoom, which is the bug being fixed. A gesture never changes
its mind mid-stroke, because that is what reads as the camera fighting you.

Zoom is NATURAL: the radius scales by `previous spacing / spacing`, so what is
under your fingers stays under them. Pan is in PIXELS; the bridge converts it
to world units at the target's depth (see `touchOrbit` in `tosi-b3d`).
*/

export interface TouchPoint {
  x: number
  y: number
}

export type TwoFingerStep =
  | { kind: 'pending' }
  | { kind: 'pan'; dx: number; dy: number }
  | { kind: 'zoom'; ratio: number }

export interface TwoFingerGesture {
  /**
   * One move of a two-finger gesture. `spacing` is the distance between the
   * fingers, `centroid` their midpoint, both in pixels. Returns what to do
   * with this move. A pan's `dx`/`dy` are centroid pixels; a zoom's `ratio`
   * multiplies the radius (below 1 zooms in).
   */
  step: (
    prevSpacing: number,
    spacing: number,
    prevCentroid: TouchPoint,
    centroid: TouchPoint
  ) => TwoFingerStep
  /** The gesture ended; the next one decides afresh. */
  reset: () => void
  readonly mode: 'pending' | 'pan' | 'zoom'
}

export function twoFingerGesture(
  options: { decidePx?: number } = {}
): TwoFingerGesture {
  const decidePx = options.decidePx ?? 12
  let mode: 'pending' | 'pan' | 'zoom' = 'pending'
  let start: { spacing: number; x: number; y: number } | null = null
  return {
    get mode() {
      return mode
    },
    reset() {
      mode = 'pending'
      start = null
    },
    step(prevSpacing, spacing, prevCentroid, centroid) {
      const dx = centroid.x - prevCentroid.x
      const dy = centroid.y - prevCentroid.y
      if (mode === 'pending') {
        start ??= { spacing: prevSpacing, x: prevCentroid.x, y: prevCentroid.y }
        const spread = Math.abs(spacing - start.spacing)
        const travel = Math.hypot(centroid.x - start.x, centroid.y - start.y)
        if (spread + travel < decidePx) return { kind: 'pending' }
        mode = spread > travel ? 'zoom' : 'pan'
      }
      if (mode === 'zoom') {
        if (!(spacing > 0) || !(prevSpacing > 0)) return { kind: 'pending' }
        return { kind: 'zoom', ratio: prevSpacing / spacing }
      }
      return { kind: 'pan', dx, dy }
    },
  }
}

/*
A WHEEL EVENT: zoom or pan? A trackpad's two-finger drag and a mouse wheel
arrive as the same `wheel` event, and a pinch arrives as one with `ctrlKey`
set (the browser's convention). So:

- a pinch (`ctrlKey`) zooms;
- a wheel that scrolls by lines or pages (`deltaMode` not 0) is a mouse: zoom;
- any sideways travel (`deltaX`) is a trackpad: pan;
- otherwise the first event of a gesture decides: a mouse notch is big
  (100 px on most systems) or Chrome-on-Mac's 4.000244… step, a trackpad's
  first move is small. The rest of the gesture (events under `gapMs` apart)
  keeps that decision, so a fast swipe does not turn into a zoom halfway.

A heuristic: no browser says which device sent a wheel event. Shift-drag pans
on any device.
*/
export type WheelKind = 'pan' | 'zoom'

export interface WheelSample {
  deltaX: number
  deltaY: number
  deltaMode: number
  ctrlKey: boolean
}

export function wheelClassifier(gapMs = 150): {
  /** `now` in milliseconds (an event's `timeStamp`). */
  kind(e: WheelSample, now: number): WheelKind
} {
  let last: { kind: WheelKind; at: number } | null = null
  return {
    kind(e, now) {
      let kind: WheelKind
      if (e.ctrlKey) kind = 'zoom'
      else if (e.deltaMode !== 0) kind = 'zoom'
      else if (e.deltaX !== 0) kind = 'pan'
      else if (last != null && now - last.at < gapMs) kind = last.kind
      else {
        const y = Math.abs(e.deltaY)
        const notch =
          y > 0 &&
          Math.abs(y / 4.000244140625 - Math.round(y / 4.000244140625)) < 1e-6
        kind = y >= 50 || notch ? 'zoom' : 'pan'
      }
      last = { kind, at: now }
      return kind
    },
  }
}
