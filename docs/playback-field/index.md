# Playback

**A clip's transport on ONE row**: play or pause, a scrub bar you can drag to
any moment, and the playback speed. A [[widgets3d|Widget3d]], so it sits in a
`panel3d` beside the rest of a panel and works the same flat, in a scene and in
a headset.

## Demo

```js
import { b3d, b3dLight, panelScene, panel3d, label3d, playback3d } from 'tosijs-3d'
import { elements } from 'tosijs'
const { div, pre } = elements

// A pretend clip, four seconds long, run by the page.
const clip = { time: 0, duration: 4, playing: true, speed: 1 }
const readout = pre({ style: 'margin:8px 16px;color:#8ea;font:12px ui-monospace,monospace' }, '')
setInterval(() => {
  if (clip.playing) clip.time = (clip.time + 0.05 * clip.speed) % clip.duration
  readout.textContent = `${clip.time.toFixed(2)} s of ${clip.duration} s  ·  ${clip.playing ? 'playing' : 'paused'}  ·  ×${clip.speed}`
}, 50)

const panel = panel3d(
  { width: 320 },
  label3d({ text: 'Walk_Loop', muted: true, compact: true }),
  playback3d({
    read: () => clip,
    handlePlay: (on) => { clip.playing = on },
    handleSeek: (t) => { clip.time = t },
    handleSpeed: (s) => { clip.speed = s },
  })
)

const { plane, sceneCreated } = panelScene({ svg: panel, target: panel, width: 2.4, camera: { radius: 3.2 } })
const scene = b3d({ style: 'border-radius:8px;overflow:hidden', sceneCreated }, b3dLight({ intensity: 1 }), plane)

preview.append(
  div(
    { style: 'display:flex;flex-direction:column;height:100%;background:#0c0e14' },
    div(
      { style: 'display:flex;gap:24px;flex:1;min-height:0;padding:16px 16px 4px' },
      div({ style: 'color:#9ab;font:12px system-ui;display:flex;flex-direction:column;gap:6px;flex:1;min-width:0' }, 'DOM', panel),
      div({ style: 'color:#9ab;font:12px system-ui;display:flex;flex-direction:column;gap:6px;flex:1;min-width:0' }, '3D texture', scene)
    ),
    readout
  )
)
```
```css
.preview {
  height: 100%;
}
```

Press the button to pause, drag the bar to any moment (it pauses there, so
you can look), and pick a speed from the menu.

## The clip is the host's

The widget holds no clock. It asks `read()` what the clip is doing (its
`time` and `duration` in seconds, whether it is `playing`, its `speed`) a few
times a second while it is on screen, and reports what a hand does through
`handlePlay`, `handleSeek` and `handleSpeed`. So it follows a clip however
the clip is driven, and a pause in the scene shows in the button.

Scrubbing pauses the clip, since a moment you drag to is one you want to see
held. Press play to carry on from there.

`speeds` sets the menu (default 0.1, 0.25, 0.5, 0.75, 1, 1.5 and 2).
