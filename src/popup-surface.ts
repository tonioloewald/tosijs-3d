/*#
# popup-surface

**A popup is another SURFACE, not more rows in the one you have.**

A menu cascade, a dropdown's open list, a debug readout — in a browser these are
absolutely positioned inside the one window you were given, and overlapping them
is a z-index problem. In a scene none of that scarcity is real: planes are cheap,
depth is an actual axis, and a panel can simply be *somewhere else*.

```js
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

## Demo

```js
import { b3d, b3dSkybox, ui, panelScene } from 'tosijs-3d'
import { demoStage, orbitCam } from 'demo-utils'
import { svgElements, elements } from 'tosijs'
const { svg, rect, text } = svgElements

// A little SVG panel, used for both the opener and its popups.
const card = (title, lines, w = 220, h = 130) =>
  svg(
    { viewBox: `0 0 ${w} ${h}`, width: w, height: h },
    rect({ x: 0, y: 0, width: w, height: h, rx: 10, fill: '#1b2430' }),
    rect({ x: 0, y: 0, width: w, height: 26, rx: 10, fill: '#2c3b4e' }),
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

      // Three popups, the last two torn off so you can drag them.
      spawn(0)
      spawn(1).tearOff()
      spawn(2).tearOff()
    },
  },
  ...demoStage({ size: 12, tiles: 8, pattern: true, timeOfDay: 11 }),
)

preview.append(scene)
```
*/
/*{ "parent": "UI", "order": 400 }*/

import * as BABYLON from '@babylonjs/core'
import { b3dSvgPlane, type B3dSvgPlane } from './b3d-svg-plane'
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
  /** Can it be grabbed and moved once torn off? Default true. */
  draggable?: boolean
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

export function openPopup(owner: B3d, opts: PopupSurfaceOptions): PopupSurface {
  const {
    svg,
    opener = null,
    width = 1,
    resolution = 512,
    offset = {},
    lift = 0.02,
    draggable = true,
  } = opts

  const vb = svg.viewBox?.baseVal
  const aspect = vb && vb.width > 0 ? vb.height / vb.width : 1

  const plane = b3dSvgPlane({
    width,
    height: width * aspect,
    resolution,
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
    mounted = true
    for (const fn of pending.splice(0)) fn()
  })

  const api: PopupSurface = {
    plane,
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
        if (!draggable) return
        /*
        DRAG IN THE PANEL'S OWN PLANE.

        The first cut used a free drag (`useObjectOrientationForDragging =
        false`, no drag plane), which is fine looking straight at it and comes
        apart the moment you orbit: the drag plane no longer relates to the
        panel, so a small hand movement throws it across the room. Tonio: "if
        you rotate the camera and drag a surface, horrible things happen."

        Constraining to the panel's own normal makes the gesture mean the same
        thing from every angle — you slide it around its face, which is what a
        flat panel affords. `useObjectOrientationForDragging` is what makes the
        normal follow the panel rather than staying stuck in world +Z.
        */
        drag = new BABYLON.PointerDragBehavior({
          dragPlaneNormal: new BABYLON.Vector3(0, 0, 1),
        })
        drag.useObjectOrientationForDragging = true
        mesh.addBehavior(drag)
        // Grabbing something brings it to the front. Without this two torn-off
        // panels at the same depth z-fight, and the one you are dragging is
        // exactly the one that must not flicker.
        drag.onDragStartObservable.add(() => bringToFront(owner, api))
        // The behaviour moves the MESH; the element would overwrite that next
        // frame. Copy back so the two agree and the panel stays where dropped.
        drag.onDragObservable.add(() => {
          plane.x = mesh.position.x
          plane.y = mesh.position.y
          plane.z = mesh.position.z
        })
      })
    },
    close() {
      if (closed) return
      closed = true
      if (drag != null) plane.mesh?.removeBehavior(drag)
      const list = openPopups.get(owner)
      if (list != null) {
        const i = list.indexOf(api)
        if (i >= 0) list.splice(i, 1)
      }
      plane.remove()
    },
  }

  // Newest on top, which is what "it just opened" should mean.
  const list = openPopups.get(owner) ?? []
  list.unshift(api)
  openPopups.set(owner, list)

  return api
}
