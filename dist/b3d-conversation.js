/*#
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
*/
/*{ "parent": "b3d-npc" }*/
import * as BABYLON from '@babylonjs/core';
import { svgElements } from 'tosijs';
import { B3dChild, semanticParent, sceneDelta } from './b3d-utils.js';
import { b3dSvgPlane } from './b3d-svg-plane.js';
import { w3dTheme } from './w3d-theme.js';
import { startConversation, } from './conversation.js';
import { BALLOON_H, BALLOON_W, BALLOON_FONT as FONT, BALLOON_PAD as PAD, balloonLayout, rowAt, } from './balloon-layout.js';
import { emptyInput } from './control-input.js';
import { gamepadFocus } from './gamepad-focus.js';
import { HardwareGamepadSource } from './hardware-gamepad.js';
const { svg, g, path, text, rect } = svgElements;
/** A balloon: one live SVG, redrawn in place, that hit-tests its own rows. */
class Balloon {
    svg;
    plane = null;
    layout = {
        box: { x: 0, y: 0, w: 0, h: 0 },
        lines: [],
        rows: [],
    };
    hover = null;
    /*
    THE PAD'S FOCUS is its own, apart from the pointer's hover: a mouse
    wandering over the balloon (or leaving it) must not move or clear what the
    D-pad chose. Drawn as the ring every panel's focus wears, once the pad is
    in use; it starts on the first reply.
    */
    focus = null;
    /** The pad is being used: its ring shows. A pointer move hides it. */
    padActive = false;
    pressed = null;
    caption = '';
    replies = [];
    pick = () => { };
    constructor() {
        this.svg = svg({
            viewBox: `0 0 ${BALLOON_W} ${BALLOON_H}`,
            width: BALLOON_W,
            height: BALLOON_H,
        });
        this.svg.handlePointer = (kind, x, y) => {
            const id = rowAt(this.layout, x, y);
            if (kind === 'down')
                this.pressed = id;
            else if (kind === 'up') {
                if (id != null && id === this.pressed)
                    this.pick(id);
                this.pressed = null;
            }
            else if (kind === 'leave')
                this.pressed = null;
            if (kind === 'move' && this.padActive) {
                this.padActive = false;
                this.draw();
            }
            if (id !== this.hover || kind === 'leave') {
                this.hover = kind === 'leave' ? null : id;
                this.draw();
            }
        };
        this.draw();
    }
    set(caption, replies) {
        if (caption === this.caption && replies === this.replies)
            return;
        this.caption = caption;
        this.replies = replies;
        this.hover = null;
        this.focus = replies[0]?.id ?? null;
        this.draw();
    }
    get empty() {
        return this.caption === '' && this.replies.length === 0;
    }
    /** It shows replies to choose from. */
    get choosing() {
        return this.replies.length > 0;
    }
    /** A pad's D-pad: step the highlighted reply (the first press lands on the first). */
    focusMove(_dx, dy) {
        if (this.replies.length === 0 || dy === 0)
            return;
        const n = this.replies.length;
        const i = this.replies.findIndex((r) => r.id === this.focus);
        // The first press only shows where the focus is; then up and down cycle.
        const next = !this.padActive || i < 0 ? Math.max(0, i) : (i + Math.sign(dy) + n) % n;
        this.focus = this.replies[next].id;
        this.padActive = true;
        this.draw();
    }
    /** A pad's click: pick the focused reply (a first press only shows it). */
    focusActivate() {
        if (this.focus == null)
            return;
        if (!this.padActive) {
            this.padActive = true;
            this.draw();
            return;
        }
        this.pick(this.focus);
    }
    draw() {
        const t = w3dTheme;
        const L = (this.layout = balloonLayout(this.caption, this.replies.map((r) => ({ id: r.id, label: r.label }))));
        if (this.empty) {
            this.svg.replaceChildren();
            return;
        }
        const { box } = L;
        const mid = BALLOON_W / 2;
        const r = 14;
        // The outline with its tail, one path, so the tail has no seam.
        const outline = `M${box.x + r},${box.y} H${box.x + box.w - r} Q${box.x + box.w},${box.y} ${box.x + box.w},${box.y + r}` +
            ` V${box.y + box.h - r} Q${box.x + box.w},${box.y + box.h} ${box.x + box.w - r},${box.y + box.h}` +
            ` H${mid + 14} L${mid},${BALLOON_H - 2} L${mid - 14},${box.y + box.h}` +
            ` H${box.x + r} Q${box.x},${box.y + box.h} ${box.x},${box.y + box.h - r}` +
            ` V${box.y + r} Q${box.x},${box.y} ${box.x + r},${box.y} Z`;
        this.svg.replaceChildren(path({ d: outline, fill: t.panelBg, stroke: t.muted, 'stroke-width': 2 }), g({ 'font-family': t.fontFamily, 'font-size': FONT, fill: t.text }, ...L.lines.map((l) => text({ x: box.x + PAD, y: l.y }, l.text)), ...L.rows.map((row) => g(rect({
            x: box.x + PAD / 2,
            y: row.y,
            width: box.w - PAD,
            height: row.h,
            rx: 8,
            fill: row.id === this.hover ? t.buttonHover : t.buttonBg,
            ...(this.padActive && row.id === this.focus
                ? { stroke: '#ffd25a', 'stroke-width': 3 }
                : {}),
        }), text({
            x: box.x + PAD,
            y: row.y + row.h / 2 + FONT * 0.35,
            fill: t.accent,
        }, row.label)))));
    }
}
/*
A BIPED WITH NO INPUT DOES NOT UPDATE (B3dControllable skips it), so a
bystander given a line would never play its talking clip. While it talks it
gets a provider that only ever stands still, taken away when the talk ends.
*/
const STAND_STILL = { poll: () => emptyInput() };
export class B3dConversation extends B3dChild {
    static preferredTagName = 'tosi-b3d-conversation';
    static initAttributes = {
        reach: 4,
        balloonWidth: 1.2,
    };
    /** The script ([[conversation]]). */
    script = null;
    /** The game's side: what the player carries, giving, taking, trading. */
    host = {};
    /** The running conversation, if any. */
    talk = null;
    whenEvent = null;
    whenEnded = null;
    _player = null;
    _theirs = new Balloon();
    _mine = new Balloon();
    _obs = null;
    _audio = null;
    _fading = [];
    _durations = new Map();
    _keys = (e) => {
        const n = Number(e.key);
        const talk = this.talk;
        if (!talk || !(n >= 1 && n <= 9))
            return;
        const reply = talk.replies[n - 1];
        if (reply != null && talk.pick(reply.id))
            e.preventDefault();
    };
    /** The biped this is nested in: who speaks the lines that are not the player's. */
    get speaker() {
        return semanticParent(this);
    }
    sceneReady(owner, scene) {
        void owner;
        this._obs = scene.onBeforeRenderObservable.add(() => this._frame(scene));
    }
    sceneDispose() {
        this.stop();
        if (this._obs)
            this.owner?.scene.onBeforeRenderObservable.remove(this._obs);
        this._obs = null;
    }
    /** Begin the talk with `player` (a biped). Returns it, or null without a script or scene. */
    start(player) {
        if (this.script == null || this.owner == null)
            return null;
        this.stop();
        this._player = player ?? null;
        const speaker = this.speaker;
        if (speaker != null && speaker.inputProvider == null) {
            speaker.inputProvider = STAND_STILL;
            this._lent = speaker;
        }
        this._preload(this.script);
        this._theirs.pick = this._mine.pick = (id) => this.talk?.pick(id);
        this._ensurePlanes();
        window.addEventListener('keydown', this._keys);
        /*
        A GAMEPAD CHOOSES TOO: the D-pad steps through the replies and B (the use
        button) picks one. Whichever balloon is showing replies takes it.
        */
        const pad = new HardwareGamepadSource();
        const showing = () => this._mine.choosing
            ? this._mine
            : this._theirs.choosing
                ? this._theirs
                : null;
        this._stopPad = gamepadFocus({
            poll: () => pad.poll(),
            target: {
                focusMove: (dx, dy) => showing()?.focusMove(dx, dy),
                focusActivate: () => showing()?.focusActivate(),
            },
            activate: ['buttonB'],
            back: [],
        });
        const host = this.host;
        this.talk = startConversation(this.script, {
            ...host,
            duration: (audio) => this._durations.get(audio) ?? host.duration?.(audio),
            handleEvent: (e) => this._event(e),
        });
        return this.talk;
    }
    /** End the talk now. */
    stop() {
        const talk = this.talk;
        if (talk != null && !talk.ended)
            talk.end();
        this._cleanup();
    }
    _lent = null;
    _stopPad = null;
    _cleanup() {
        window.removeEventListener('keydown', this._keys);
        this._stopPad?.();
        this._stopPad = null;
        if (this._lent != null && this._lent.inputProvider === STAND_STILL)
            this._lent.inputProvider = null;
        this._lent = null;
        this._stopAudio();
        this._theirs.set('', []);
        this._mine.set('', []);
        for (const b of [this._theirs, this._mine]) {
            b.plane?.remove();
            b.plane = null;
        }
    }
    // Audio lengths are known before a line plays, so it lasts as long as its sound.
    _preload(script) {
        const urls = new Set();
        for (const n of Object.values(script.nodes)) {
            for (const l of n.lines)
                if (l.audio)
                    urls.add(l.audio);
            for (const r of n.replies ?? [])
                if (typeof r.line === 'object' && r.line.audio)
                    urls.add(r.line.audio);
        }
        for (const url of urls) {
            if (this._durations.has(url))
                continue;
            const a = new Audio();
            a.preload = 'metadata';
            a.addEventListener('loadedmetadata', () => {
                if (Number.isFinite(a.duration))
                    this._durations.set(url, a.duration);
            });
            a.src = url;
        }
    }
    _ensurePlanes() {
        const width = Number(this.balloonWidth) || 1.2;
        for (const b of [this._theirs, this._mine]) {
            if (b.plane != null)
                continue;
            const plane = b3dSvgPlane({
                width,
                height: (width * BALLOON_H) / BALLOON_W,
                resolution: 768,
                updateInterval: 50,
                transparent: 'depth',
            });
            plane.svgElement = b.svg;
            b.plane = plane;
            this.owner.append(plane);
        }
    }
    _isPlayer(line) {
        return line.speaker === (this.script?.player ?? 'player');
    }
    _event(e) {
        const talk = this.talk;
        const speaker = this.speaker;
        if (e.type === 'line') {
            const mine = this._isPlayer(e.line);
            if (mine)
                this._mine.set(e.line.text, []);
            else {
                this._theirs.set(e.line.text, []);
                this._mine.set('', []);
                const gesture = e.line.gesture;
                if (!(gesture && speaker?.perform?.(gesture)))
                    speaker?.perform?.('talk', e.seconds);
            }
            this._play(e.line.audio);
        }
        else if (e.type === 'lineEnd') {
            if (e.cut) {
                this._stopAudio();
                if (!this._isPlayer(e.line))
                    speaker?.endPerform?.();
            }
        }
        else if (e.type === 'replies') {
            const caption = talk?.line != null && !this._isPlayer(talk.line) ? talk.line.text : '';
            this._theirs.set(caption, e.replies);
        }
        else if (e.type === 'picked') {
            this._theirs.set('', []);
        }
        else if (e.type === 'end') {
            speaker?.endPerform?.();
        }
        if (talk != null)
            this.whenEvent?.(e, talk);
        if (e.type === 'end') {
            this._cleanup();
            if (talk != null)
                this.whenEnded?.(talk);
        }
    }
    _play(url) {
        this._stopAudio();
        if (!url)
            return;
        const a = new Audio(url);
        this._audio = a;
        a.play().catch(() => {
            /* no gesture yet, or no file: the caption carries it */
        });
    }
    // A cut line fades out quickly rather than stopping dead.
    _stopAudio() {
        if (this._audio != null)
            this._fading.push(this._audio);
        this._audio = null;
    }
    _frame(scene) {
        const dt = sceneDelta(scene);
        for (const a of this._fading)
            a.volume = Math.max(0, a.volume - dt / 0.15);
        this._fading = this._fading.filter((a) => {
            if (a.volume > 0)
                return true;
            a.pause();
            return false;
        });
        const talk = this.talk;
        if (talk == null || talk.ended)
            return;
        talk.tick(dt);
        if (talk.ended)
            return;
        const them = this.speaker;
        const me = this._player;
        const at = (t) => t?.mesh?.getAbsolutePosition() ?? null;
        const p = at(me);
        const q = at(them);
        // Walked away: the talk ends (unless a trade has the player elsewhere).
        if (p && q && !talk.trading) {
            const d = Math.hypot(p.x - q.x, p.z - q.z);
            if (d > (Number(this.reach) || 4)) {
                talk.end();
                return;
            }
            if (them?.mesh)
                this._face(them.mesh, p, dt);
        }
        this._place(this._theirs, them, !talk.trading);
        this._place(this._mine, me, !talk.trading);
    }
    // The speaker eases round to face whoever it is talking to.
    _face(node, target, dt) {
        const here = node.getAbsolutePosition();
        const want = new BABYLON.Vector3(target.x - here.x, 0, target.z - here.z);
        const fwd = node.forward;
        const now = new BABYLON.Vector3(fwd.x, 0, fwd.z);
        if (want.lengthSquared() < 1e-6 || now.lengthSquared() < 1e-6)
            return;
        want.normalize();
        now.normalize();
        const angle = Math.acos(Math.max(-1, Math.min(1, BABYLON.Vector3.Dot(now, want))));
        if (angle < 0.02)
            return;
        const step = Math.min(angle, dt * 4);
        const before = BABYLON.Vector3.Dot(now, want);
        node.rotate(BABYLON.Axis.Y, step, BABYLON.Space.WORLD);
        node.computeWorldMatrix(true);
        const after = node.forward;
        // Which way round is measured, not assumed (a glTF root mirrors).
        if (BABYLON.Vector3.Dot(new BABYLON.Vector3(after.x, 0, after.z).normalize(), want) < before)
            node.rotate(BABYLON.Axis.Y, -2 * step, BABYLON.Space.WORLD);
    }
    // A balloon hangs over its speaker's head, turned to the camera.
    _place(b, who, show) {
        const mesh = b.plane?.mesh;
        if (mesh == null)
            return;
        const top = who != null ? this._headTop(who) : null;
        const visible = show && top != null && !b.empty;
        mesh.setEnabled(visible);
        if (!visible || top == null)
            return;
        mesh.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
        const h = ((Number(this.balloonWidth) || 1.2) * BALLOON_H) / BALLOON_W;
        mesh.position.set(top.x, top.y + 0.1 + h / 2, top.z);
    }
    _headTop(who) {
        const head = who.entries?.skeletons?.[0]?.bones.find((b) => ['Head', 'head', 'mixamorig:Head'].includes(b.name));
        const node = head?.getTransformNode();
        if (node != null)
            return node.getAbsolutePosition().add(new BABYLON.Vector3(0, 0.22, 0));
        const m = who.mesh;
        if (m == null)
            return null;
        const { max } = m.getHierarchyBoundingVectors(true);
        const c = m.getAbsolutePosition();
        return new BABYLON.Vector3(c.x, max.y, c.z);
    }
}
export const b3dConversation = B3dConversation.elementCreator();
//# sourceMappingURL=b3d-conversation.js.map