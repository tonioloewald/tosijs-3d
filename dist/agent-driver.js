/*#
# agent driver

**How an agent drives: with the controls, never by moving things.** An
`AgentDriver` turns a command into `ControlInput` each frame, which the
controllable in focus merges in place of the player's (see
[agents](/b3d-agent/)). So an agent's car obeys the same grip, walls and
traffic as yours, and anything it can do, a player could.

Two commands:

- **hold**: some controls held for a time (`{ forward: 1, turn: -0.3 }` for
  2 s). The raw form.
- **go**: drive to a point. A ground vehicle aims its heading at it, slows
  for the turn and for the stop, and brakes to rest on arrival. A straight
  line, no route finding: when it stops making progress (3 m in 5 s, the
  rule traffic uses) it reports `stuck` rather than pushing on.

Any deliberate input from the player cancels the command: the player's own
hands always win. Pure: no Babylon, no clock (time is the `dt` it is given).

```javascript
import { AgentDriver } from 'tosijs-3d/agent-driver'
const d = new AgentDriver()
d.go({ x: 30, z: 40 }, { place: 'harbour', speed: 12 })
const input = d.step(dt, { x, z, heading, speed })   // each frame
d.status   // { state: 'running', distance: 41.2, … } → 'arrived'
```
*/
/*{ "parent": "b3d-agent", "order": 10 }*/
/** Degrees, 0 = +z, 90 = +x, from a direction. */
export function headingDeg(dir) {
    const h = (Math.atan2(dir.x, dir.z) * 180) / Math.PI;
    return h < 0 ? h + 360 : h;
}
/** The turn from `heading` at `from` to face `to`: -180..180, + is right. */
export function bearingDeg(from, heading, to) {
    let d = headingDeg({ x: to.x - from.x, z: to.z - from.z }) - heading;
    while (d > 180)
        d -= 360;
    while (d <= -180)
        d += 360;
    return d;
}
/** Smallest stick or button the player can press on purpose. */
export const DELIBERATE = 0.2;
/** Is the player pressing anything? A twitch under `DELIBERATE` is not. */
export function isDeliberate(input) {
    for (const v of Object.values(input))
        if (typeof v === 'number' && Math.abs(v) >= DELIBERATE)
            return true;
    return false;
}
const clamp = (v, lo = -1, hi = 1) => Math.max(lo, Math.min(hi, v));
/** Progress needed to not be stuck: this far in this long. */
const PROGRESS_M = 3;
const PROGRESS_S = 5;
export class AgentDriver {
    _status = { state: 'idle', elapsed: 0 };
    hold = null;
    goal = null;
    best = Infinity;
    sinceProgress = 0;
    get status() {
        return { ...this._status };
    }
    get running() {
        return this._status.state === 'running';
    }
    /** Hold some controls for `seconds` of world time. */
    holdInput(input, seconds) {
        this.reset();
        this.hold = { input, seconds: Math.max(0, seconds) };
        this._status = { state: 'running', command: 'hold', elapsed: 0 };
    }
    /** Drive to `target` (world metres). */
    go(target, options = {}) {
        this.reset();
        this.goal = {
            x: target.x,
            z: target.z,
            speed: options.speed ?? 10,
            arrive: options.arrive ?? 4,
            timeout: options.timeout ?? 120,
        };
        this._status = {
            state: 'running',
            command: 'go',
            ...(options.place ? { place: options.place } : {}),
            target: { x: target.x, z: target.z },
            elapsed: 0,
        };
    }
    /** End the command: `cancelled` with a reason. */
    stop(reason = 'stopped') {
        if (!this.running)
            return;
        this._status = { ...this._status, state: 'cancelled', reason };
        this.hold = null;
        this.goal = null;
    }
    reset() {
        this.hold = null;
        this.goal = null;
        this.best = Infinity;
        this.sinceProgress = 0;
    }
    end(state, reason) {
        this._status = { ...this._status, state, ...(reason ? { reason } : {}) };
        this.hold = null;
        this.goal = null;
    }
    /**
     * One frame: the controls to apply, or null when there is no command (the
     * player's input stands).
     */
    step(dt, pose) {
        if (!this.running)
            return null;
        this._status.elapsed += dt;
        if (this.hold != null) {
            if (this._status.elapsed >= this.hold.seconds) {
                this.end('done');
                return null;
            }
            return this.hold.input;
        }
        const g = this.goal;
        if (g == null)
            return null;
        const dist = Math.hypot(g.x - pose.x, g.z - pose.z);
        this._status.distance = Math.round(dist * 10) / 10;
        if (dist <= g.arrive) {
            // Brake to rest; arrived once stopped.
            if (Math.abs(pose.speed) < 0.5) {
                this.end('arrived');
                return { forward: 0, jump: 1 };
            }
            return { forward: pose.speed > 0 ? -1 : 1 };
        }
        if (dist < this.best - PROGRESS_M) {
            this.best = dist;
            this.sinceProgress = 0;
        }
        else if ((this.sinceProgress += dt) >= PROGRESS_S) {
            this.end('stuck', `no progress in ${PROGRESS_S} s, ${dist.toFixed(0)} m short`);
            return { forward: 0 };
        }
        if (this._status.elapsed >= g.timeout) {
            this.end('stuck', `not there after ${g.timeout} s`);
            return { forward: 0 };
        }
        const bearing = bearingDeg(pose, pose.heading, g);
        // Slow for the stop (about 3 m/s² of braking) and for the turn.
        const brakeTo = Math.sqrt(2 * 3 * Math.max(0, dist - g.arrive * 0.5));
        const turnFactor = Math.max(0.25, Math.cos((Math.min(90, Math.abs(bearing)) * Math.PI) / 180));
        const want = Math.min(g.speed, brakeTo) * turnFactor;
        const forward = clamp((want - pose.speed) * 0.4);
        const turn = clamp(bearing / 25);
        return { forward, turn };
    }
}
//# sourceMappingURL=agent-driver.js.map