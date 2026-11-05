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
