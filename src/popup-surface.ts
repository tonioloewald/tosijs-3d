/*#
# popup-surface

**A popup is another SURFACE, not more rows in the one you have.**

```js
import { b3d } from 'tosijs-3d'
import { demoStage, orbitCam } from 'tosijs-3d/demo-utils'
import { svgElements, elements } from 'tosijs'
const { svg, rect, text } = svgElements

// A little SVG panel, used for both the opener and its popups.
// No `rx` on the background: the MESH is rounded now, so rounding the svg too
// would only round the texture inside an already-rounded silhouette — a darker
// fringe, and fill nobody asked for. (Tonio: "we can slightly simplify our svg
// outer rect as well for a few ns of savings lol")
const card = (title, lines, w = 220, h = 130) =>
  svg(
    { viewBox: `0 0 ${w} ${h}`, width: w, height: h },
    rect({ x: 0, y: 0, width: w, height: h, fill: '#1b2430' }),
    rect({ x: 0, y: 0, width: w, height: 26, fill: '#2c3b4e' }),
    text({ x: 12, y: 18, fill: '#e6edf5', 'font-size': 13, 'font-family': 'sans-serif' }, title),
    ...lines.map((l, i) =>
      text({ x: 12, y: 48 + i * 18, fill: '#9fb0c3', 'font-size': 12, 'font-family': 'sans-serif' }, l)
    )
  )

let opened = []
const scene = b3d(
  {
    sceneCreated(el) {
      orbitCam(el, { radius: 4.2, beta: Math.PI / 2.6, target: [0, 1.2, 0] })

      // The opener: one ordinary in-scene panel.
      const base = el.make.plane({ width: 1.6, height: 0.95, y: 1.2, color: '#101820' })
      base.isPickable = true

      const spawn = (n) => {
        const pop = el.openPopup({
          svg: card(`popup ${n}`, ['spawned as its own surface', 'tear off, then drag me']),
          opener: base,
          width: 0.9,
          // Fan them out and step each one nearer the viewer, so depth does the
          // stacking that a z-index would do flat.
          offset: { x: 0.55 + n * 0.16, y: 0.3 - n * 0.22, z: -0.06 * (n + 1) },
        })
        opened.push(pop)
        return pop
      }

      // popup 0 stays OWNED — parented to the panel, so it travels with it.
      // Drag it and it tears itself off, like pulling a tab out of a window.
      spawn(0)
      spawn(1).tearOff()
      // A MODAL blocks pointer access to everything behind it (the other
      // popups included) until it closes. The camera still moves.
      const m = el.openPopup({
        svg: card('modal', ['blocks the ones behind it', 'camera still moves']),
        width: 0.9,
        offset: { x: -0.8, y: 0.2, z: -0.3 },
        modal: true,
      })
      opened.push(m)
    },
  },
  ...demoStage({ size: 12, tiles: 8, texture: '/tosi-warhol-testgrid.svg', timeOfDay: 11 }),
)

preview.append(scene)
```

A menu cascade, a dropdown's open list, a debug readout — in a browser these are
absolutely positioned inside the one window you were given, and overlapping them
is a z-index problem. In a scene none of that scarcity is real: planes are cheap,
depth is an actual axis, and a panel can simply be *somewhere else*.

```javascript
import { openPopup } from 'tosijs-3d'

const pop = openPopup(el, { svg: mySvg, opener: panel.mesh, width: 1.1 })
pop.tearOff() // promote it: stays where you put it, and can be dragged
pop.close()
```

## Why not lay it out inside the opener

We had written the opposite down as a hard constraint — a dropdown "**MUST**
grow the panel's layout rather than a DOM-style absolute popover, because a
popover won't rasterize into the VR texture". Half of that is true: you cannot
draw outside the SVG that becomes the texture. The leap it hides is that the
popup must therefore live *in* that SVG. It doesn't. It can be **another texture
on another plane**, and then the constraint simply isn't binding.

What that buys, beyond the dropdown:

- **The opener stops reflowing.** Opening a debug tool currently shoves the
  author's controls down the panel — the thing you were reading moves because
  you asked about something else.
- **Tear-offs stop being a feature.** A popup that is already its own surface
  becomes "leave this open over there" by re-parenting, not by new machinery.
- **Depth replaces z-index.** `lift` pulls the popup toward the viewer, which is
  the effect flat UI fakes with shadows and scrims.

## Chrome: a title bar you can grab, and an x

A popup draws a **move** glyph and a **close** glyph into the top of its own
SVG, and the top `gripHeight` of the panel is the only place a drag starts.

That grip is not decoration. A popup with controls in it needs its own pointer
events — if a drag began anywhere on the surface, every button press inside it
would be a failed drag instead. Restricting the gesture to a title bar is what
lets the rest of the panel be interactive, and the icon is what makes that rule
visible rather than something you have to be told.

The glyphs are injected here rather than left to the caller so they cannot drift
out of line with the hit regions this module tests against — a move icon that
isn't where the grip is would be worse than no icon at all. They are drawn with
`iconGlyph`, not `svgIcons`, because this SVG becomes a TEXTURE and
`currentColor` resolves against nothing there.

## Ownership, and what tearing off changes

A popup is **owned**: parented to its opener, so it travels with it and is
disposed with it. `tearOff()` promotes it to world space **preserving its world
pose** (Babylon's `setParent(null)` does that arithmetic for us), after which it
is nobody's child, stays where it is, and — if `draggable` — can be grabbed and
moved. Ownership is a lifetime statement, not a position one; that split is the
same one `SPATIAL-DESIGN.md` draws for riding an elevator.

## Budget

Every surface is a texture. Two or three floating panels are nothing; twenty is
a VRAM problem on a Quest, and VR is the tier with the least headroom. Callers
should treat concurrent surfaces as a budget — the ambient allocator's rule
applies, so something that cannot have its honest minimum should switch OFF
rather than degrade.

*/
/*{ "parent": "UI", "order": 400 }*/

import * as BABYLON from '@babylonjs/core'
import { b3dSvgPlane, type B3dSvgPlane } from './b3d-svg-plane'
import { iconGlyph } from './svg-icons'
import { chromeLayout, chromeHit, uvToViewBox } from './popup-chrome'
import { cameraIsAttached } from './b3d-utils'
import type { B3d } from './tosi-b3d'

export interface PopupSurfaceOptions {
  /** The panel's content. Its viewBox aspect sets the plane's height. */
  svg: SVGSVGElement
  /**
   * What this popup belongs to. Parented to it, so it travels with it and dies
   * with it. Omit for a popup that is born free.
   */
  opener?: BABYLON.TransformNode | BABYLON.AbstractMesh | null
  /** World width; height follows the svg's aspect. Default 1. */
  width?: number
  /** Texture resolution. Default 512 — each surface is a texture, see Budget. */
  resolution?: number
  /** Position relative to the opener (or world, if there is none). */
  offset?: { x?: number; y?: number; z?: number }
  /**
   * Extra nudge toward the viewer, in world units. Depth is what makes a popup
   * read as "on top" without a z-index. Default 0.02 — enough to beat
   * co-planar z-fighting, small enough not to look detached.
   */
  lift?: number
  /**
   * Can it be grabbed and moved? Default true.
   *
   * Dragging an OWNED popup tears it off first — the same gesture as pulling a
   * tab out of a window, and the reason an owned popup doesn't need a separate
   * "tear off" affordance to be discoverable.
   */
  draggable?: boolean
  /**
   * Fraction of the panel's height that acts as the TITLE BAR — the only place
   * a drag starts. Default 0.2; `0` makes the whole panel draggable.
   *
   * A grip rather than the whole surface, because a popup with controls in it
   * needs its own pointer events: if dragging started anywhere, every button
   * press would try to move the panel. Tonio: "indicate you can only drag them
   * by the title bar in case the popup needs pointer stuff".
   */
  gripHeight?: number
  /** Draw the move / close glyphs into the title bar. Default true — an
   * affordance nobody can see is not an affordance. */
  chrome?: boolean
  /**
   * A modal blocks pointer interaction with everything BEHIND it until it
   * closes. The camera still moves — a modal owns the UI, not your head, and in
   * a headset you cannot take someone's view away without making them ill.
   */
  modal?: boolean
}

export interface PopupSurface {
  /** The plane element (an `AbstractMesh`, so it has x/y/z and rx/ry/rz). */
  plane: B3dSvgPlane
  /** Dispose it. Safe to call twice. */
  close(): void
  /**
   * Promote to world space, preserving world pose: it stops being owned, stays
   * where it is, and becomes draggable. Idempotent.
   */
  tearOff(): void
  readonly tornOff: boolean
  /** Internal: the depth offset currently applied by the stack, so restacking
   * replaces it rather than accumulating. */
  stackLift?: { x: number; y: number; z: number }
  /** Internal: does this one block what is behind it? */
  modal?: boolean
  /** Internal: the panel's viewBox and the chrome geometry derived from it —
   * shared by the drawing and the hit testing so they cannot disagree. */
  vbWidth: number
  vbHeight: number
  chromeLayout: ReturnType<typeof chromeLayout>
  /** Internal: start the move gesture (called after the grip hit test). */
  /**
   * Internal: start a drag, grabbing at `pickedPoint` so the panel keeps the
   * offset you grabbed it by instead of jumping to centre on the pointer.
   */
  beginDrag(
    pointerId: number,
    pickedPoint?: BABYLON.Vector3,
    ray?: BABYLON.Ray
  ): void
  /** Internal: end it on pointerup — the behaviour's own release is disabled. */
  endDrag(): void
  /** Bring this popup to the front of the stack. */
  toFront(): void
}

/**
 * Open a popup as its own surface.
 *
 * Returns immediately; the plane mounts through the normal `B3dChild` pull
 * lifecycle, so the parenting and placement are applied once its mesh exists
 * rather than being guessed at a fixed delay.
 */
/*
Open popups per scene, in depth order — front of the list is nearest the viewer.

A WeakMap so a disposed scene takes its popups with it: this is a UI registry,
not a reason to keep a scene alive.
*/
const openPopups = new WeakMap<B3d, PopupSurface[]>()

/** Depth step between stacked popups, world units. Big enough to beat
 * z-fighting at panel scale, small enough that a stack still reads as a stack. */
const DEPTH_STEP = 0.012

/**
 * Restack so `front` is nearest the viewer.
 *
 * Depth does the job a z-index does flat — but unlike a z-index it is a real
 * position, so it has to be re-applied rather than merely re-sorted.
 */
function bringToFront(owner: B3d, front: PopupSurface): void {
  const list = openPopups.get(owner)
  if (list == null) return
  const i = list.indexOf(front)
  if (i > 0) {
    list.splice(i, 1)
    list.unshift(front)
  }
  const cam = owner.scene?.activeCamera
  list.forEach((p, depth) => {
    const mesh = p.plane.mesh
    if (mesh == null) return
    // Toward the CAMERA, not along world -Z: "in front" is a viewer-relative
    // claim, and a stack arranged along a world axis is only correct from one
    // side of the room.
    const toward =
      cam != null
        ? cam.globalPosition.subtract(mesh.absolutePosition).normalize()
        : new BABYLON.Vector3(0, 0, -1)
    const lift = toward.scale(DEPTH_STEP * (list.length - depth))
    p.plane.x = mesh.position.x + lift.x - (p.stackLift?.x ?? 0)
    p.plane.y = mesh.position.y + lift.y - (p.stackLift?.y ?? 0)
    p.plane.z = mesh.position.z + lift.z - (p.stackLift?.z ?? 0)
    p.stackLift = { x: lift.x, y: lift.y, z: lift.z }
  })
}

/** One pointer hook per scene, installed lazily — not one per popup. */
const wired = new WeakSet<B3d>()

/**
 * Make everything behind the topmost modal un-pickable, and restore it when the
 * modal goes away.
 *
 * ⚠️ The obvious implementation is to cancel the pointer event
 * (`skipOnPointerObservable = true`) when the press is not on the modal. I did
 * that first and it BROKE MOUSE CONTROL: Babylon's camera pointer inputs route
 * through `onPointerObservable` too, so cancelling there kills orbit along with
 * the UI. Tonio, immediately: "I can only rotate the view in some places. Other
 * places mouse doesn't work at all."
 *
 * So the block is expressed as what it actually means — those panels are not
 * targets right now — instead of as a veto over the whole pointer pipeline. The
 * camera is untouched, which matters more in a headset than anywhere: a modal
 * owns the UI, not your head, and freezing someone's view is how you make them
 * ill.
 */
/**
 * WHO IS PICKABLE while a modal is open — the pure decision, extracted so the
 * rule can be tested without a scene.
 *
 * `true` for everything when no modal is open (which is what makes `close()`
 * restore the stack — regress that and every popup becomes permanently
 * untargetable while the camera still works, which reads as "the UI died").
 * With a modal open, only the FIRST modal in the list is pickable.
 */
export function modalPickable(popups: { modal?: boolean }[]): boolean[] {
  const modal = popups.find((p) => p.modal === true) ?? null
  return popups.map((p) => modal == null || p === modal)
}

function applyModalBlocking(owner: B3d): void {
  const list = openPopups.get(owner)
  if (list == null) return
  const pickable = modalPickable(list)
  list.forEach((p, i) => {
    const mesh = p.plane.mesh
    if (mesh == null) return
    mesh.isPickable = pickable[i]
  })
}

/**
 * Wire click-to-front and modal blocking for a scene.
 *
 * `onPointerObservable`, NOT `onPrePointerObservable`.
 *
 * Both matter and the ordering is the whole bug. `PointerDragBehavior` also
 * listens on POINTERDOWN, and its handler releases any drag whose
 * `_activeDragButton` doesn't match the event's button. `startDrag()` leaves
 * that at -1, so starting the drag from the PRE observable meant Babylon's own
 * pass ran afterwards and killed it inside the same event: one dragStart, one
 * dragEnd, zero drags, and a popup that jumps to front but never follows the
 * pointer. Starting AFTER that pass leaves the drag alive.
 *
 * Modal blocking does not need the pre-pass, because it is done by making the
 * panels behind un-pickable rather than by vetoing events.
 */
function wirePointer(owner: B3d): void {
  if (wired.has(owner)) return
  wired.add(owner)
  const scene = owner.scene
  if (scene == null) return

  /*
  THE CAMERA HAS TO YIELD, or the drag is invisible.

  Starting our drag was necessary and not sufficient: the ArcRotateCamera's
  pointer input is on this same observable and registers FIRST (the camera
  exists before any popup), so a press on a panel began a camera orbit as well.
  Both ran; the orbit is what you saw. Tonio, driving it: "I can drag the window
  around. I cannot move the pop-ups, none of them. They just cause me to drag
  the windows."

  `panelScene` already solved this for in-scene UI — claim the gesture, detach
  the camera, re-attach on release. Same move here. `cameraIsAttached` is the
  guard from the pause bug: only re-attach a camera that WAS attached, or a
  scene whose camera is deliberately unattached gets handed control it never
  had.
  */
  let yielded: BABYLON.Camera | null = null
  const yieldCamera = (): void => {
    const cam = scene.activeCamera
    if (cam == null || !cameraIsAttached(cam)) return
    cam.detachControl()
    yielded = cam
  }
  const restoreCamera = (): void => {
    if (yielded == null) return
    yielded.attachControl(
      scene.getEngine().getRenderingCanvas() as HTMLCanvasElement,
      true
    )
    yielded = null
  }

  scene.onPointerObservable.add((info) => {
    const list = openPopups.get(owner)
    if (list == null || list.length === 0) return
    // ONLY on a press. This used to pick on every pointer event, moves
    // included — a scene pick per mouse-move, for a question that can only be
    // answered by a click. Blocking is handled by `isPickable` now, so nothing
    // here needs to run while you are merely moving the mouse.
    if (info.type === BABYLON.PointerEventTypes.POINTERUP) {
      // With `startAndReleaseDragOnPointerEvents` off, the behaviour's own
      // release branch is gated off too — so nothing would ever end the drag
      // and the panel would stick to the cursor forever.
      for (const p of list) p.endDrag()
      restoreCamera()
      return
    }
    if (info.type !== BABYLON.PointerEventTypes.POINTERDOWN) return

    // Un-pickable panels are skipped by the pick itself, so a modal's blocking
    // needs no test here.
    const hit = scene.pick(scene.pointerX, scene.pointerY, (m) =>
      list.some((p) => p.plane.mesh === m)
    )
    const onPopup = hit?.hit === true ? hit.pickedMesh : null

    if (onPopup != null) {
      // CLICK to front, not just drag-to-front: raising something only when you
      // move it means a panel you merely want to READ stays buried.
      const target = list.find((p) => p.plane.mesh === onPopup)
      if (target == null) return
      bringToFront(owner, target)

      /*
      Where in the panel did the press land? The texture coordinate is the
      panel's own space, so the hit regions are expressed in the same units the
      chrome was drawn in — no world-space arithmetic, and it stays correct
      however the panel is rotated or scaled.

      UV v is flipped relative to SVG y (0 at the bottom), so the TITLE BAR is
      the top of the panel: v above 1 - gripHeight.
      */
      const uv = hit?.getTextureCoordinates?.()
      if (uv == null) return
      /*
      Classify in the panel's OWN units, against the same layout the chrome was
      drawn from. The first version compared a UV x (a WIDTH fraction) against
      the grip height (a HEIGHT fraction) — on a portrait panel the close region
      and the drawn × were fully disjoint, so pressing close fell through to the
      drag branch and tore the popup off its opener instead. See `popup-chrome`.
      */
      const pt = uvToViewBox(uv.x, uv.y, target.vbWidth, target.vbHeight)
      const what = chromeHit(pt.x, pt.y, target.chromeLayout)
      if (what === 'content') return // the panel's own UI must reach it
      if (what === 'close') {
        target.close()
        return
      }
      // Yield BEFORE starting: the camera must not have the press either.
      yieldCamera()
      target.beginDrag(
        (info.event as PointerEvent | undefined)?.pointerId ?? 0,
        // The point on the panel actually under the pointer, and the ray that
        // found it — see beginDrag for why both are required.
        info.pickInfo?.pickedPoint ?? undefined,
        info.pickInfo?.ray ?? undefined
      )
    }
  })
}

export function openPopup(owner: B3d, opts: PopupSurfaceOptions): PopupSurface {
  const {
    svg,
    opener = null,
    width = 1,
    resolution = 512,
    offset = {},
    lift = 0.02,
    draggable = true,
    modal = false,
    gripHeight = 0.2,
    chrome = true,
  } = opts

  const vb = svg.viewBox?.baseVal
  const aspect = vb && vb.width > 0 ? vb.height / vb.width : 1

  /*
  CHROME, drawn into the caller's SVG.

  The panel's content is the caller's; its HANDLES are ours, because they have
  to line up with the hit regions this module tests against. Injecting them here
  keeps the two from drifting — a move icon that isn't where the grip is would be
  worse than no icon.

  `iconGlyph` rather than `svgIcons`: this SVG is rasterized to a texture, where
  `currentColor` resolves against nothing and paints black.
  */
  const vbW = vb && vb.width > 0 ? vb.width : 100
  const vbH = vb && vb.height > 0 ? vb.height : 100
  // ONE layout, used by the drawing below AND by the hit test in `wirePointer`.
  const layout = chromeLayout(vbW, vbH, gripHeight, draggable)
  if (chrome && layout.barHeight > 0) {
    if (layout.move != null) {
      svg.appendChild(
        iconGlyph('move', {
          color: '#8fa3ba',
          size: layout.move.size,
          x: layout.move.x,
          y: layout.move.y,
        })
      )
    }
    svg.appendChild(
      iconGlyph('close', {
        color: '#8fa3ba',
        size: layout.close.size,
        x: layout.close.x,
        y: layout.close.y,
      })
    )
  }

  const plane = b3dSvgPlane({
    width,
    height: width * aspect,
    resolution,
    // OPAQUE, with the corners cut out of the mesh. A transparent panel does
    // not write depth, so Babylon re-sorts it per frame by distance and
    // near-coplanar popups swap order as you orbit — the "z-chasing" that no
    // amount of correct depth ordering fixed. Geometry for the silhouette,
    // z-buffer for the ordering.
    cornerRadius: Math.min(0.05, width * 0.06),
    transparent: 'off',
    // Self-lit: a UI panel should read the same under any scene lighting.
    materialChannel: 'emissive',
    // The plane routes its own picks to the SVG's `handlePointer`; a popup with
    // no interactive content still wants this so it doesn't swallow the ray.
    pointerEvents: 'on',
  }) as B3dSvgPlane
  plane.svgElement = svg

  let tornOff = false
  let closed = false
  let drag: BABYLON.PointerDragBehavior | null = null

  /*
  THE ELEMENT OWNS THE TRANSFORM, not the mesh.

  `AbstractMesh.render()` rewrites `mesh.position` from the element's x/y/z on
  EVERY frame, so writing `mesh.position` here is silently undone — the popups
  sat at the origin and looked unplaced. The same trap eats a drag behaviour,
  which is why the drag below syncs back into x/y/z rather than being left to
  move the mesh. (Same family as `ry` being degrees: when an element manages a
  node, the element's fields are the source of truth and the node's are output.)
  */
  const place = (): void => {
    const mesh = plane.mesh
    if (mesh == null) return
    if (opener != null) mesh.parent = opener
    plane.x = offset.x ?? 0
    plane.y = offset.y ?? 0
    plane.z = (offset.z ?? 0) - lift
    // Apply to the node NOW as well as to the element. The element's own render
    // writes exactly these values on its next pass, but `tearOff` reads
    // `absolutePosition` and would otherwise get a pose one frame stale — which
    // it then bakes in, dropping the panel at its opener instead of where it
    // appears.
    mesh.position.set(plane.x, plane.y, plane.z)
    mesh.computeWorldMatrix(true)
  }

  /** Run `fn` once the plane has a mesh — now, or on the first frame it does. */
  const whenMesh = (fn: () => void): void => {
    owner.whenReady(() => {
      if (plane.mesh != null) {
        fn()
        return
      }
      // The plane builds its mesh in its OWN sceneReady, which may not have run
      // when ours does. One observer beats a guessed delay.
      const obs = owner.scene.onBeforeRenderObservable.add(() => {
        if (plane.mesh == null) return
        owner.scene.onBeforeRenderObservable.remove(obs)
        fn()
      })
    })
  }

  /*
  One queue, so ORDER is guaranteed. `tearOff()` is normally called on the line
  after `openPopup()`, i.e. long before the mesh exists — with two independent
  deferrals it raced `place`, read the un-offset pose, and baked the popup onto
  its opener. Everything after mount goes through here.
  */
  let mounted = false
  const pending: Array<() => void> = []
  const afterMount = (fn: () => void): void => {
    if (mounted) fn()
    else pending.push(fn)
  }

  owner.appendChild(plane as unknown as Node)
  whenMesh(() => {
    place()
    // Owned popups are draggable too — the gesture tears them off. Without
    // this, popup 0 was simply immovable with nothing saying why, which is a
    // rule you have to be TOLD rather than one you can discover.
    attachDrag()
    wirePointer(owner)
    applyModalBlocking(owner)
    mounted = true
    for (const fn of pending.splice(0)) fn()
  })

  /**
   * Attach the move gesture. Shared, because an owned popup gets one too — and
   * dragging an owned popup TEARS IT OFF first, which is the same gesture as
   * pulling a tab out of a window and is why an owned popup needs no separate
   * tear-off affordance to be discoverable.
   */
  const attachDrag = (): void => {
    const mesh = plane.mesh
    if (mesh == null || drag != null || !draggable) return
    /*
    DRAG IN THE PANEL'S OWN PLANE.

    A free drag is fine looking straight at the panel and comes apart the moment
    you orbit: the drag plane stops relating to the panel, so a small hand
    movement throws it across the room. Tonio: "if you rotate the camera and
    drag a surface, horrible things happen." Constraining to the panel's own
    normal makes the gesture mean the same thing from every angle.
    */
    drag = new BABYLON.PointerDragBehavior({
      dragPlaneNormal: new BABYLON.Vector3(0, 0, 1),
    })
    drag.useObjectOrientationForDragging = true
    // WE decide when a drag starts — the scene hook does the hit test against
    // the title bar first. Left to itself the behaviour grabs on any press
    // anywhere on the panel, which would make every button inside it a
    // failed drag.
    if (gripHeight > 0) drag.startAndReleaseDragOnPointerEvents = false
    mesh.addBehavior(drag)
    drag.onDragStartObservable.add(() => {
      // Pull a tab out of the window: moving an owned popup promotes it.
      if (!tornOff) api.tearOff()
      bringToFront(owner, api)
    })
    // The behaviour moves the MESH; the element would overwrite that next
    // frame. Copy back so the two agree and the panel stays where dropped.
    drag.onDragObservable.add(() => {
      plane.x = mesh.position.x
      plane.y = mesh.position.y
      plane.z = mesh.position.z
    })
  }

  const api: PopupSurface = {
    plane,
    modal,
    vbWidth: vbW,
    vbHeight: vbH,
    chromeLayout: layout,
    beginDrag(
      pointerId: number,
      pickedPoint?: BABYLON.Vector3,
      ray?: BABYLON.Ray
    ) {
      if (drag == null || !draggable) return
      /*
      AFTER THE WHOLE EVENT, not merely after our own handler.

      `PointerDragBehavior`'s POINTERDOWN handler releases any drag whose
      `_activeDragButton` doesn't match the event's button, and `startDrag()`
      leaves that at -1 — so whichever observer runs LAST wins. Registration
      order decides that, and it is not stable here: `wirePointer` installs once
      on the first popup's mount, so popup 0's behaviour registers before it and
      every later popup's registers after. The first popup dragged; the rest did
      not. That is what Tonio hit — "I cannot move the pop-ups, none of them" —
      after I had already "fixed" this once by reordering.

      A microtask runs after every observer for this event, so the answer stops
      depending on who registered first. Ordering was the wrong lever; the right
      one is to leave the event entirely.
      */
      const id = pointerId
      /*
      PASS THE GRAB POINT, or the panel jumps.

      `startDrag(id)` alone leaves Babylon with no start point, so it grabs at
      the MESH ORIGIN — the panel snaps until its centre is under the pointer
      and then follows. Tonio: "when you click on an element it drifts to
      centre the mouse pointer rather than preserving the offset." Handing it
      the point actually under the pointer makes the panel stay where you took
      hold of it, which is what every drag anywhere else does.

      Cloned because the pick info is reused by the scene: keeping the live
      vector means the grab point quietly becomes wherever the pointer is now,
      which is the same bug wearing a disguise.
      */
      const grab = pickedPoint?.clone()
      /*
      THE RAY MATTERS AS MUCH AS THE POINT.

      Passing only `startPickedPoint` was not enough — Babylon's `_startDrag`
      falls back to a ray built from `activeCamera.position` when `fromRay` is
      omitted, so it still had no idea where the POINTER was and recomputed the
      drag plane from that default. The panel kept snapping to centre. Tonio,
      after the first attempt: "the popup-surface is still drifting to center."

      Both are needed: the ray says where the gesture is pointing, the point
      says where on the panel it took hold. Cloned for the same reason as the
      point — Babylon reuses its pick info between events.
      */
      const grabRay = ray != null ? new BABYLON.Ray(ray.origin.clone(), ray.direction.clone(), ray.length) : undefined
      queueMicrotask(() => {
        if (drag == null || closed) return
        drag.startDrag(id, grabRay, grab)
      })
    },
    endDrag() {
      if (drag?.dragging === true) drag.releaseDrag()
    },
    toFront() {
      bringToFront(owner, api)
    },
    get tornOff() {
      return tornOff
    },
    tearOff() {
      if (tornOff || closed) return
      tornOff = true
      // Queued BEHIND placement, not merely deferred — see the note above.
      afterMount(() => {
        const mesh = plane.mesh
        if (mesh == null || closed) return
        /*
        `setParent(null)`, not `parent = null`: the first PRESERVES world pose
        by baking the parent's transform into the child; the second drops it and
        the panel teleports to wherever its local offset points. Not moving at
        the instant it stops being owned is the whole of "tearing off".
        */
        const world = mesh.absolutePosition.clone()
        mesh.setParent(null)
        // …and hand the world pose to the ELEMENT, or its per-frame sync writes
        // the old parent-relative offset straight back over it.
        plane.x = world.x
        plane.y = world.y
        plane.z = world.z
        attachDrag()
      })
    },
    close() {
      if (closed) return
      closed = true
      // Remove first, THEN re-evaluate: if this was the modal, whatever it was
      // blocking has to become reachable again.
      if (drag != null) plane.mesh?.removeBehavior(drag)
      const list = openPopups.get(owner)
      if (list != null) {
        const i = list.indexOf(api)
        if (i >= 0) list.splice(i, 1)
      }
      plane.remove()
      applyModalBlocking(owner)
    },
  }

  // Newest on top, which is what "it just opened" should mean.
  const list = openPopups.get(owner) ?? []
  list.unshift(api)
  openPopups.set(owner, list)

  /*
  RE-APPLY, because the mount above may already have run.

  `owner.appendChild` drains the ready queue SYNCHRONOUSLY once the scene is up,
  so for a popup opened at runtime `applyModalBlocking` fires during mount —
  before this registration — and reads a list that does not contain this popup.
  A `modal: true` popup therefore found no modal, set every OTHER popup back to
  `isPickable = true`, and blocked nothing at all.

  It only looked correct in the doc demo, which opens inside `sceneCreated`
  while the queue is still deferred, so registration wins the race there.

  Running it here as well is the fix and is idempotent: the mount-time call
  still covers the deferred path (where `plane.mesh` may not exist yet, which
  `applyModalBlocking` already skips).
  */
  applyModalBlocking(owner)

  return api
}
