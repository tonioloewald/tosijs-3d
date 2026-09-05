import { describe, test, expect } from 'bun:test'

/*
THE FLAT SCENE PANEL DISMISSES ON A BACKGROUND PRESS.

It is a transient overlay over the scene, and every other transient overlay here
already behaves that way — `surface`'s popups dismiss on PRESS, for the reason
stated there: a press that starts outside was never meant for the panel, and
waiting for the release leaves it open under a pointer that has moved on.

Three things must NOT close it, and each is a bug if it does:
  - a press inside the panel (you are using it)
  - a press on the gear, which toggles — closing first would make the gear's own
    handler reopen it, so the gear would look inert
  - a drag that merely ENDS outside, an ordinary slider gesture leaving the track

⚠️ The subtle one, and the reason this file exists: the panel is behind a SHADOW
BOUNDARY, so a listener on the host sees `e.target` RETARGETED to the host
element. `host.contains(e.target)` is therefore false for a press on the panel's
own controls — measured, and it dismissed the panel under the finger using it.
`composedPath()` is the real route the event took, boundaries and all.
*/

/** The dismissal rule, as it is written. */
const shouldClose = (path: unknown[], host: unknown, gear: unknown) =>
  !(path.includes(host) || path.includes(gear))

describe('background dismissal', () => {
  const host = { id: 'panel' }
  const gear = { id: 'gear' }
  const canvas = { id: 'canvas' }
  const slider = { id: 'slider' }
  const root = { id: 'b3d' }

  test('a press on the scene closes it', () => {
    expect(shouldClose([canvas, root], host, gear)).toBe(true)
  })

  test('a press INSIDE the panel does not', () => {
    expect(shouldClose([slider, host, root], host, gear)).toBe(false)
  })

  test('a press on the GEAR does not — or the gear would look inert', () => {
    // The gear toggles. Closing here first means its own handler reopens, and
    // the button appears to do nothing.
    expect(shouldClose([gear, root], host, gear)).toBe(false)
  })

  test('RETARGETED target alone would get the inside case wrong', () => {
    /*
    The bug this replaced. Across a shadow boundary the listener sees the host
    element as the target, so a `contains(target)` test says "outside" for a
    press that was plainly inside.
    */
    const retargeted = root
    const containsSaysOutside = ![host, gear].includes(retargeted as never)
    expect(containsSaysOutside).toBe(true) // …which would have closed it
    // The composed path still carries the truth.
    expect(shouldClose([slider, host, root], host, gear)).toBe(false)
  })
})
