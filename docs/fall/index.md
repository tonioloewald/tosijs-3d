# fall

What a fall does to a body, as pure rules: how far it drops before it reads as
falling rather than stepping down, and what the landing is.

```javascript
import { landingOutcome, fallRules } from 'tosijs-3d/fall'

const rules = fallRules(1.8, { lethalFall: 6 })
landingOutcome(1, rules)   // 'soft': the jump's own landing
landingOutcome(3, rules)   // 'hard': a heavy landing that holds you a moment
landingOutcome(7, rules)   // 'lethal': you die where you land
```

Heights are the DROP: from the highest point of the flight (the top of a
jump's arc, or the ledge you walked off) to where you land. A jump on flat
ground drops only as far as it rose, so it lands softly however it was made.

Defaults scale with the body, because a fall is a fact about the body: a
hard landing from 1.5 body heights (2.7 m for a 1.8 m person). A lethal fall
is OFF unless asked for (`lethalFall`, metres): a death needs an exit, and
only a scene with one (`<tosi-b3d-death>`) should kill.

The biped uses these (`hardLanding`, `lethalFall`); see [b3d-biped](/b3d-biped/).
