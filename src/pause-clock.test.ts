import { describe, test, expect, beforeAll } from 'bun:test'

/*
THE PAUSE CONTRACT: a published frame delta of ZERO means time is stopped.

tosijs-3d#30 — an adopter measured a player travelling 66.58 m during a
3-second pause, with `el.paused === true` for the whole window. Nothing threw;
the stick simply stopped working while the world carried on, which reads as
"the pause button is broken" rather than as a clock bug.

The cause was a sign-of-omission in `sceneDelta`: it accepted a published delta
only when `> 0`, so the one value that means "stopped" was the one value it
discarded, falling back to the live engine clock. Every simulation that runs on
the render observable — projectiles, water, ambient, demo spinners — therefore
kept advancing at full speed.

This pins the zero specifically, because it is the case that looks like a
missing value and is actually the whole feature.
*/

// `b3d-utils` reaches tosijs, which wants a DOM at import time — so stand one
// up first and import dynamically, exactly as `stick-sign.test.ts` does.
let sceneDelta: typeof import('./b3d-utils.js').sceneDelta
let cameraIsAttached: typeof import('./b3d-utils.js').cameraIsAttached

beforeAll(async () => {
  const { Window } = await import('happy-dom')
  const win = new Window() as any
  const g = globalThis as any
  g.window ??= win
  for (const k of Object.getOwnPropertyNames(win)) {
    try {
      g[k] ??= win[k]
    } catch {
      /* off-document getters */
    }
  }
  ;({ sceneDelta, cameraIsAttached } = await import('./b3d-utils.js'))
})

/** Just enough scene for `sceneDelta`: published metadata + an engine clock
 * that would be plainly visible if it leaked through. */
const fakeScene = (published?: number, engineMs = 16) =>
  ({
    metadata: published === undefined ? {} : { b3dFrameDelta: published },
    getEngine: () => ({ getDeltaTime: () => engineMs }),
  } as any)

describe('sceneDelta — a published zero is honoured, not treated as absent', () => {
  test('ZERO STOPS THE WORLD (#30)', () => {
    expect(sceneDelta(fakeScene(0))).toBe(0)
  })

  test('and it holds even while the engine clock keeps ticking fast', () => {
    // The regression exactly: the engine says 33ms, the scene says stopped.
    expect(sceneDelta(fakeScene(0, 33))).toBe(0)
  })

  test('a live published delta is passed through', () => {
    expect(sceneDelta(fakeScene(0.02))).toBeCloseTo(0.02)
  })

  test('no published delta at all still falls back to the engine', () => {
    // The fallback is for scenes that never publish — not for one that
    // published a deliberate zero.
    expect(sceneDelta(fakeScene(undefined, 16))).toBeCloseTo(0.016)
  })

  test('the fallback stays capped, so a long stall is not one giant step', () => {
    expect(sceneDelta(fakeScene(undefined, 5000))).toBeCloseTo(0.1)
  })
})

/*
RESUMING MUST NOT HAND THE CANVAS TO A CAMERA THAT NEVER HAD IT.

The pause panel detaches the camera and restores it on resume. The restore was
guarded by a flag set to `true` whenever a camera merely EXISTED — while the
comment above it claimed "only if we were the ones who detached it". Every
gameplay camera in this library is installed unattached (`{attach: false}` in
b3d-biped, b3d-input-focus, and the death rig), and Babylon's FollowCamera wires
arrows/wheel/drag by default — the same arrows KeyboardGamepad uses for the
right stick. So tabbing away and back (pauseWhenHidden defaults ON) then hitting
Continue gave the player's look keys a second owner.

The asymmetry is why this reads real state instead of remembering: a wrong
"attached" silently steals control, a wrong "not attached" costs one click.
*/
describe('cameraIsAttached — ground truth, not a flag we keep', () => {
  test('an unattached gameplay camera reads false', () => {
    expect(cameraIsAttached({ inputs: { attachedToElement: false } })).toBe(
      false
    )
  })

  test('an attached camera reads true', () => {
    expect(cameraIsAttached({ inputs: { attachedToElement: true } })).toBe(true)
  })

  test('EXISTING IS NOT ATTACHED — the bug, stated directly', () => {
    // The old guard's actual test was `camera != null`. A camera with no input
    // manager at all, or one that never reported, must not read as attached.
    expect(cameraIsAttached({})).toBe(false)
    expect(cameraIsAttached({ inputs: {} })).toBe(false)
  })

  test('null and undefined are safe on the resume path', () => {
    expect(cameraIsAttached(null)).toBe(false)
    expect(cameraIsAttached(undefined)).toBe(false)
  })
})
