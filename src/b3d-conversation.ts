/*#
# b3d-conversation

**Talk to someone in the scene.** Nest it in a `<tosi-b3d-biped>` and give it
a [[conversation]] script; `start(player)` begins the talk. The speaker turns
to face you and talks (UAL's talking loop) or gestures while a line plays,
the line appears in a speech balloon over its head, your replies appear in the
balloon as its line nears its end, and your character's own line goes in a
balloon over you. Pick a reply with the pointer (flat or a controller in a
headset) or its number key. Walk away and the talk ends: you are never held
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
*/
/*{ "parent": "b3d-npc" }*/

import * as BABYLON from '@babylonjs/core'
import { svgElements } from 'tosijs'
import { B3dChild, semanticParent, sceneDelta } from './b3d-utils.js'
import { b3dSvgPlane, type B3dSvgPlane } from './b3d-svg-plane.js'
import { w3dTheme } from './w3d-theme.js'
import {
  startConversation,
  type Conversation,
  type ConversationEvent,
  type ConversationHost,
  type ConversationLine,
  type ConversationReply,
  type ConversationScript,
} from './conversation.js'
import type { B3d } from './tosi-b3d.js'
import {
  BALLOON_H,
  BALLOON_W,
  BALLOON_FONT as FONT,
  BALLOON_PAD as PAD,
  balloonLayout,
  rowAt,
  type BalloonLayout,
} from './balloon-layout.js'
import { emptyInput, type InputProvider } from './control-input.js'

const { svg, g, path, text, rect } = svgElements

/** A balloon: one live SVG, redrawn in place, that hit-tests its own rows. */
class Balloon {
  readonly svg: SVGSVGElement
  plane: B3dSvgPlane | null = null
  private layout: BalloonLayout = { box: { x: 0, y: 0, w: 0, h: 0 }, lines: [], rows: [] }
  private hover: string | null = null
  private pressed: string | null = null
  private caption = ''
  private replies: ConversationReply[] = []
  pick: (id: string) => void = () => {}

  constructor() {
    this.svg = svg({
      viewBox: `0 0 ${BALLOON_W} ${BALLOON_H}`,
      width: BALLOON_W,
      height: BALLOON_H,
    }) as SVGSVGElement
    // The plane routes picks (mouse, touch, a controller) here as viewBox coordinates.
    ;(this.svg as any).handlePointer = (kind: string, x: number, y: number) => {
      const id = rowAt(this.layout, x, y)
      if (kind === 'down') this.pressed = id
      else if (kind === 'up') {
        if (id != null && id === this.pressed) this.pick(id)
        this.pressed = null
      } else if (kind === 'leave') this.pressed = null
      if (id !== this.hover || kind === 'leave') {
        this.hover = kind === 'leave' ? null : id
        this.draw()
      }
    }
    this.draw()
  }

  set(caption: string, replies: ConversationReply[]): void {
    if (caption === this.caption && replies === this.replies) return
    this.caption = caption
    this.replies = replies
    this.hover = null
    this.draw()
  }

  get empty(): boolean {
    return this.caption === '' && this.replies.length === 0
  }

  private draw(): void {
    const t = w3dTheme
    const L = (this.layout = balloonLayout(
      this.caption,
      this.replies.map((r) => ({ id: r.id, label: r.label }))
    ))
    if (this.empty) {
      this.svg.replaceChildren()
      return
    }
    const { box } = L
    const mid = BALLOON_W / 2
    const r = 14
    // The outline with its tail, one path, so the tail has no seam.
    const outline =
      `M${box.x + r},${box.y} H${box.x + box.w - r} Q${box.x + box.w},${box.y} ${box.x + box.w},${box.y + r}` +
      ` V${box.y + box.h - r} Q${box.x + box.w},${box.y + box.h} ${box.x + box.w - r},${box.y + box.h}` +
      ` H${mid + 14} L${mid},${BALLOON_H - 2} L${mid - 14},${box.y + box.h}` +
      ` H${box.x + r} Q${box.x},${box.y + box.h} ${box.x},${box.y + box.h - r}` +
      ` V${box.y + r} Q${box.x},${box.y} ${box.x + r},${box.y} Z`
    this.svg.replaceChildren(
      path({ d: outline, fill: t.panelBg, stroke: t.muted, 'stroke-width': 2 }),
      g(
        { 'font-family': t.fontFamily, 'font-size': FONT, fill: t.text },
        ...L.lines.map((l) => text({ x: box.x + PAD, y: l.y }, l.text)),
        ...L.rows.map((row) =>
          g(
            rect({
              x: box.x + PAD / 2,
              y: row.y,
              width: box.w - PAD,
              height: row.h,
              rx: 8,
              fill: row.id === this.hover ? t.buttonHover : t.buttonBg,
            }),
            text({ x: box.x + PAD, y: row.y + row.h / 2 + FONT * 0.35, fill: t.accent }, row.label)
          )
        )
      )
    )
  }
}

interface Talker {
  mesh?: BABYLON.AbstractMesh | null
  entries?: { skeletons?: BABYLON.Skeleton[]; rootNodes?: BABYLON.TransformNode[] }
  perform?: (state: string, seconds?: number) => number
  endPerform?: () => void
  inputProvider?: InputProvider | null
}

/*
A BIPED WITH NO INPUT DOES NOT UPDATE (B3dControllable skips it), so a
bystander given a line would never play its talking clip. While it talks it
gets a provider that only ever stands still, taken away when the talk ends.
*/
const STAND_STILL: InputProvider = { poll: () => emptyInput() }

export class B3dConversation extends B3dChild {
  static preferredTagName = 'tosi-b3d-conversation'

  static initAttributes = {
    reach: 4,
    balloonWidth: 1.2,
  }

  declare reach: number
  declare balloonWidth: number

  /** The script ([[conversation]]). */
  script: ConversationScript | null = null
  /** The game's side: what the player carries, giving, taking, trading. */
  host: ConversationHost = {}
  /** The running conversation, if any. */
  talk: Conversation | null = null
  whenEvent: ((event: ConversationEvent, talk: Conversation) => void) | null = null
  whenEnded: ((talk: Conversation) => void) | null = null

  private _player: Talker | null = null
  private _theirs = new Balloon()
  private _mine = new Balloon()
  private _obs: BABYLON.Nullable<BABYLON.Observer<BABYLON.Scene>> = null
  private _audio: HTMLAudioElement | null = null
  private _fading: HTMLAudioElement[] = []
  private _durations = new Map<string, number>()
  private _keys = (e: KeyboardEvent) => {
    const n = Number(e.key)
    const talk = this.talk
    if (!talk || !(n >= 1 && n <= 9)) return
    const reply = talk.replies[n - 1]
    if (reply != null && talk.pick(reply.id)) e.preventDefault()
  }

  /** The biped this is nested in: who speaks the lines that are not the player's. */
  get speaker(): Talker | null {
    return semanticParent(this) as unknown as Talker | null
  }

  sceneReady(owner: B3d, scene: BABYLON.Scene): void {
    void owner
    this._obs = scene.onBeforeRenderObservable.add(() => this._frame(scene))
  }

  sceneDispose(): void {
    this.stop()
    if (this._obs) this.owner?.scene.onBeforeRenderObservable.remove(this._obs)
    this._obs = null
  }

  /** Begin the talk with `player` (a biped). Returns it, or null without a script or scene. */
  start(player?: unknown): Conversation | null {
    if (this.script == null || this.owner == null) return null
    this.stop()
    this._player = (player as Talker) ?? null
    const speaker = this.speaker
    if (speaker != null && speaker.inputProvider == null) {
      speaker.inputProvider = STAND_STILL
      this._lent = speaker
    }
    this._preload(this.script)
    this._theirs.pick = this._mine.pick = (id) => this.talk?.pick(id)
    this._ensurePlanes()
    window.addEventListener('keydown', this._keys)
    const host = this.host
    this.talk = startConversation(this.script, {
      ...host,
      duration: (audio) => this._durations.get(audio) ?? host.duration?.(audio),
      handleEvent: (e) => this._event(e),
    })
    return this.talk
  }

  /** End the talk now. */
  stop(): void {
    const talk = this.talk
    if (talk != null && !talk.ended) talk.end()
    this._cleanup()
  }

  private _lent: Talker | null = null

  private _cleanup(): void {
    window.removeEventListener('keydown', this._keys)
    if (this._lent != null && this._lent.inputProvider === STAND_STILL) this._lent.inputProvider = null
    this._lent = null
    this._stopAudio()
    this._theirs.set('', [])
    this._mine.set('', [])
    for (const b of [this._theirs, this._mine]) {
      b.plane?.remove()
      b.plane = null
    }
  }

  // Audio lengths are known before a line plays, so it lasts as long as its sound.
  private _preload(script: ConversationScript): void {
    const urls = new Set<string>()
    for (const n of Object.values(script.nodes)) {
      for (const l of n.lines) if (l.audio) urls.add(l.audio)
      for (const r of n.replies ?? [])
        if (typeof r.line === 'object' && r.line.audio) urls.add(r.line.audio)
    }
    for (const url of urls) {
      if (this._durations.has(url)) continue
      const a = new Audio()
      a.preload = 'metadata'
      a.addEventListener('loadedmetadata', () => {
        if (Number.isFinite(a.duration)) this._durations.set(url, a.duration)
      })
      a.src = url
    }
  }

  private _ensurePlanes(): void {
    const width = Number(this.balloonWidth) || 1.2
    for (const b of [this._theirs, this._mine]) {
      if (b.plane != null) continue
      const plane = b3dSvgPlane({
        width,
        height: (width * BALLOON_H) / BALLOON_W,
        resolution: 768,
        updateInterval: 50,
        transparent: 'depth',
      }) as B3dSvgPlane
      plane.svgElement = b.svg
      b.plane = plane
      ;(this.owner as unknown as HTMLElement).append(plane)
    }
  }

  private _isPlayer(line: ConversationLine): boolean {
    return line.speaker === (this.script?.player ?? 'player')
  }

  private _event(e: ConversationEvent): void {
    const talk = this.talk
    const speaker = this.speaker
    if (e.type === 'line') {
      const mine = this._isPlayer(e.line)
      if (mine) this._mine.set(e.line.text, [])
      else {
        this._theirs.set(e.line.text, [])
        this._mine.set('', [])
        const gesture = e.line.gesture
        if (!(gesture && speaker?.perform?.(gesture))) speaker?.perform?.('talk', e.seconds)
      }
      this._play(e.line.audio)
    } else if (e.type === 'lineEnd') {
      if (e.cut) {
        this._stopAudio()
        if (!this._isPlayer(e.line)) speaker?.endPerform?.()
      }
    } else if (e.type === 'replies') {
      const caption = talk?.line != null && !this._isPlayer(talk.line) ? talk.line.text : ''
      this._theirs.set(caption, e.replies)
    } else if (e.type === 'picked') {
      this._theirs.set('', [])
    } else if (e.type === 'end') {
      speaker?.endPerform?.()
    }
    if (talk != null) this.whenEvent?.(e, talk)
    if (e.type === 'end') {
      this._cleanup()
      if (talk != null) this.whenEnded?.(talk)
    }
  }

  private _play(url?: string): void {
    this._stopAudio()
    if (!url) return
    const a = new Audio(url)
    this._audio = a
    a.play().catch(() => {
      /* no gesture yet, or no file: the caption carries it */
    })
  }

  // A cut line fades out quickly rather than stopping dead.
  private _stopAudio(): void {
    if (this._audio != null) this._fading.push(this._audio)
    this._audio = null
  }

  private _frame(scene: BABYLON.Scene): void {
    const dt = sceneDelta(scene)
    for (const a of this._fading) a.volume = Math.max(0, a.volume - dt / 0.15)
    this._fading = this._fading.filter((a) => {
      if (a.volume > 0) return true
      a.pause()
      return false
    })
    const talk = this.talk
    if (talk == null || talk.ended) return
    talk.tick(dt)
    if (talk.ended) return
    const them = this.speaker
    const me = this._player
    const at = (t: Talker | null) => t?.mesh?.getAbsolutePosition() ?? null
    const p = at(me)
    const q = at(them)
    // Walked away: the talk ends (unless a trade has the player elsewhere).
    if (p && q && !talk.trading) {
      const d = Math.hypot(p.x - q.x, p.z - q.z)
      if (d > (Number(this.reach) || 4)) {
        talk.end()
        return
      }
      if (them?.mesh) this._face(them.mesh, p, dt)
    }
    this._place(this._theirs, them, !talk.trading)
    this._place(this._mine, me, !talk.trading)
  }

  // The speaker eases round to face whoever it is talking to.
  private _face(node: BABYLON.AbstractMesh, target: BABYLON.Vector3, dt: number): void {
    const here = node.getAbsolutePosition()
    const want = new BABYLON.Vector3(target.x - here.x, 0, target.z - here.z)
    const fwd = node.forward
    const now = new BABYLON.Vector3(fwd.x, 0, fwd.z)
    if (want.lengthSquared() < 1e-6 || now.lengthSquared() < 1e-6) return
    want.normalize()
    now.normalize()
    const angle = Math.acos(Math.max(-1, Math.min(1, BABYLON.Vector3.Dot(now, want))))
    if (angle < 0.02) return
    const step = Math.min(angle, dt * 4)
    const before = BABYLON.Vector3.Dot(now, want)
    node.rotate(BABYLON.Axis.Y, step, BABYLON.Space.WORLD)
    node.computeWorldMatrix(true)
    const after = node.forward
    // Which way round is measured, not assumed (a glTF root mirrors).
    if (BABYLON.Vector3.Dot(new BABYLON.Vector3(after.x, 0, after.z).normalize(), want) < before)
      node.rotate(BABYLON.Axis.Y, -2 * step, BABYLON.Space.WORLD)
  }

  // A balloon hangs over its speaker's head, turned to the camera.
  private _place(b: Balloon, who: Talker | null, show: boolean): void {
    const mesh = b.plane?.mesh
    if (mesh == null) return
    const top = who != null ? this._headTop(who) : null
    const visible = show && top != null && !b.empty
    mesh.setEnabled(visible)
    if (!visible || top == null) return
    mesh.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL
    const h = ((Number(this.balloonWidth) || 1.2) * BALLOON_H) / BALLOON_W
    mesh.position.set(top.x, top.y + 0.1 + h / 2, top.z)
  }

  private _headTop(who: Talker): BABYLON.Vector3 | null {
    const head = who.entries?.skeletons?.[0]?.bones.find((b) =>
      ['Head', 'head', 'mixamorig:Head'].includes(b.name)
    )
    const node = head?.getTransformNode()
    if (node != null) return node.getAbsolutePosition().add(new BABYLON.Vector3(0, 0.22, 0))
    const m = who.mesh
    if (m == null) return null
    const { max } = m.getHierarchyBoundingVectors(true)
    const c = m.getAbsolutePosition()
    return new BABYLON.Vector3(c.x, max.y, c.z)
  }
}

export const b3dConversation = B3dConversation.elementCreator()
