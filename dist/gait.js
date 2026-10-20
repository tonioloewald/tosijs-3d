/*
GAIT, pure: which forward clip the biped plays at a speed. Babylon-free so
the hysteresis is testable (0.11 gate, #3422).

`speed` is the stick's forward amount, `sprint` the share of it that is
running (`speed * sprint input`). The jog is the run up to near full speed;
past it the rig's own sprint, if it has one, held until the speed drops back
a little, so an analog trigger near the line does not flicker between them.
*/
/** Start sprinting above this share of full speed… */
export const SPRINT_ENTER = 0.8;
/** …and keep sprinting until below this one. */
export const SPRINT_LEAVE = 0.7;
export function forwardGait(speed, sprintSpeed, wasSprinting, hasSprint) {
    const at = wasSprinting ? SPRINT_LEAVE : SPRINT_ENTER;
    const sprinting = hasSprint && sprintSpeed > at;
    if (sprinting)
        return { state: 'sprint', scale: sprintSpeed, sprinting };
    if (sprintSpeed > 0.25) {
        return { state: 'run', scale: sprintSpeed + 0.25, sprinting };
    }
    return { state: 'walk', scale: speed + 0.25, sprinting };
}
//# sourceMappingURL=gait.js.map