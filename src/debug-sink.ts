/*#
# debug-sink

Somewhere for a page to send what it would otherwise print: a headset has no
console, and its readings used to reach whoever was debugging by being read
aloud.

Off until a URL is set. With one, `sendDebug(tag, event)` posts a line of JSON
to it, and `<tosi-b3d>` reports the things that are worth having afterwards:
every step of a cost sweep, the Perf Stats lines while that popup is open, a
lost WebGL context, any event passed to `logDebug`, and every uncaught error
or promise rejection on the page, with its stack.

```javascript
import { debugSink } from 'tosijs-3d'

debugSink.url = '/__debug-sink'
```

`/__debug-sink` is the endpoint a tosijs-ui dev server opens when its site
config has `debugSink: true`: it appends each post as one line of a file
outside the project, and prints that file's path at startup. Any endpoint that
accepts a POST works.

Sent with `navigator.sendBeacon`, which does not wait for an answer and still
goes out when the page is about to die. That is the case it is for: the last
line before a hang is the one you want.
*/
/*{ "parent": "performance", "order": 60 }*/

export const debugSink = { url: '' }

/** Post one event to the sink. Does nothing when no URL is set. */
export function sendDebug(tag: string, event: Record<string, unknown>): void {
  if (debugSink.url === '') return
  try {
    navigator.sendBeacon(
      debugSink.url,
      // `page`: three sweeps in a row say nothing about which scene each was.
      JSON.stringify({ t: Date.now(), page: location.pathname, tag, ...event })
    )
  } catch {
    /* a diagnostic must never be what breaks the page */
  }
}
