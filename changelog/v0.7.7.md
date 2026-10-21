# 0.7.7

<!--{ "parent": "CHANGELOG", "order": 9992993 }-->

A lifecycle release. `<tosi-b3d>` now distinguishes being **moved** from being
**removed**, which fixes an engine leak and a scene-corruption bug that were the
same root cause seen from two ends.

## Fixed

- **A MOVE no longer costs a scene** (#58, and the real cause of the black sky
  in #51). `connectedCallback` built an Engine and a Scene unconditionally, so
  re-parenting built a SECOND pair — and disposing the first deleted its
  materials' shader programs, after which the surviving scene rendered black
  while every uniform read correct and `isReady()` returned `true`.

  Re-parenting fires `disconnectedCallback` then `connectedCallback` in the same
  task, and it need not touch the element at all: moving any **ancestor** does it
  to every descendant. Ensemble hit this with a `<tosi-b3d>` inside their own
  shadow root, re-parented by the doc system — their MutationObserver recorded no
  `tosi-b3d` add or remove at all while two scenes were being built.

  Teardown is now deferred by a task, so a reconnect cancels it and reuses the
  engine.

- **A genuine removal disposes the Engine and Scene.** Teardown released the XR
  helper, the quality subscription and the debug timers, but never the engine —
  so every removed scene left a live render loop turning over a detached canvas
  forever. A WebGL context is not just memory: Chrome caps them near 16 per page
  and force-loses the _oldest_, so an SPA that visits scene pages works for a
  dozen route changes and then a scene that was fine goes black.

  This is also the better explanation for doc-site slowdown after visiting
  several demos, and possibly for headset degradation — N abandoned render loops
  compete for frame time, which retained VRAM does not.

- **`whenReady` no longer drops queued callbacks.** Asking for the scene and
  having it torn down before it was ready lost the callback silently — no call,
  no error, nothing to observe. It now survives and fires against the next scene.

- **`addSceneListener` is no longer handed dead meshes.** Past additions outlived
  their scene, so after a rebuild a late subscriber received nodes belonging to
  the disposed one.

## Added

- **`b3d.whenDisposed(cb)` → unsubscribe** — the other half of `whenReady`, and
  the half that did not exist. Fires on a genuine disposal, **not** on a move.
  Durable across rebuilds, so register once.

  Use it for anything holding a reference _into_ the scene that a child's
  `sceneDispose()` does not cover — a timer closing over a mesh, a material
  cache, an observer on a node. After disposal those point at a dead scene, and
  Babylon's failure mode there is a black material that still reports
  `isReady()`: silent, not loud.

  One rule governs both hooks: **subscriptions are durable, scene state is not.**
