# b3d-conversation

**Talk to someone in the scene.** Nest it in a `<tosi-b3d-biped>` and give it
a [[conversation]] script; `start(player)` begins the talk. The speaker turns
to face you and talks (UAL's talking loop) or gestures while a line plays,
the line appears in a speech balloon over its head, your replies appear in the
balloon as its line nears its end, and your character's own line goes in a
balloon over you. Pick a reply with the pointer (flat or a controller in a
headset), its number key, or on a gamepad the D-pad and **B**. Walk away and the talk ends: you are never held
in place.

```javascript
import { b3dBiped, b3dConversation, ualAnimationStates } from 'tosijs-3d'

const talk = b3dConversation()
talk.script = shopScript // see [[conversation]]
talk.host = {
  has: (kind, qty) => count(kind) >= qty,
  give: (kind, qty) => addToBag(kind, qty), // null, or why not
  take: (kind, qty) => takeFromBag(kind, qty),
  trade: (done) => openShop(done), // the talk resumes when it closes
}
const keeper = b3dBiped({ url, animationStates: ualAnimationStates() }, talk)
// when the player presses interact at the counter:
talk.start(hero)
```

A line's `gesture` is one of the biped's states (`yes`, `no`, `give`, `show`,
`surprise`, `foldArms` in `ualAnimationStates`), or any state you add; without
one the speaker talks for the line's length. A line with `audio` plays it (a
URL) and lasts as long as it. While a trade is open the balloons are hidden.

| Attribute | Default | Description |
| --- | --- | --- |
| `reach` | `4` | Metres: walk further than this from the speaker and the talk ends |
| `balloonWidth` | `1.2` | The balloon's width in metres |

`whenEvent(event, talk)` sees every [[conversation]] event; `whenEnded(talk)`
is called when it ends. `talk` (the property) is the running conversation.
