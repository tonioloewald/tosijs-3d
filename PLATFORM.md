# PLATFORM.md — where this thing runs, and why we don't go native

> **The decision, up front.** We stay on the web. We do **not** abstract the renderer, and we do
> **not** port the framework to a native engine. If we want app-store presence, we **wrap** the web
> app (Tauri) and accept that the wrapper gives us a good _flat_ 3D app while XR keeps living on the
> open web.
>
> This doc exists so that decision isn't re-litigated from scratch in six months. The valuable part
> isn't the conclusion — it's the **rejected alternatives, and the specific reasons they fail.**

## The question that prompted it

"What if we want to ship a native Android/iOS app (say, a Tauri wrapper)? Under iOS we won't get
full JSC performance — should we build the architecture to run natively?"

The premise turned out to be **false in the good direction**, and it inverts the answer.

## 1. iOS: the WebView is the FAST path, not the slow one

The "no JIT on iOS" folklore is real but it applies to **in-process JavaScriptCore**
(`JSContext` / `JavaScriptCore.framework` — what React Native's JSC uses), _not_ to WKWebView.

| Surface                                   | JIT?                                 |
| ----------------------------------------- | ------------------------------------ |
| **WKWebView** (what Tauri iOS uses)       | ✅ **Full JIT** — baseline, DFG, FTL |
| In-process `JSContext` (React Native JSC) | ❌ **None** — LLInt interpreter only |

WKWebView runs JS out-of-process in `com.apple.WebKit.WebContent`, an Apple-signed system XPC
service. **The JIT entitlement rides on _that_ process, not on your app** — which is why any
third-party app gets it with zero entitlement work. Apple put it on the record at WWDC 2014
(Session 206): "the full power of the JavaScript Nitro engine… this includes the fourth-tier
compiler" (fourth-tier = FTL).

And the in-process case is _worse_ than usually stated: **baseline is itself a JIT tier** (it needs
RWX pages), so an in-process `JSContext` loses **all four** compiled tiers, not just the top ones.

**Therefore: going native on iOS would be a performance REGRESSION we pay complexity for**, not a
win we trade complexity for. This is not our inference — it is
[Babylon's own documentation](https://github.com/BabylonJS/BabylonNative/blob/master/Documentation/WhenToUseBabylonNative.md):

> "on iOS, **WebViews are allowed to run JavaScript with JIT enabled while React Native, and
> consequently Babylon React Native, are not**." … "you might try rendering the same thing using
> **Babylon.js in a WebView**."

The vendor of the native path recommends the WebView. That's as strong as this evidence gets.

### The two iOS caveats worth banking

- **⚠️ Lockdown Mode is the one real loss condition, and you cannot defend against it.** It swaps in
  a separate un-entitled WebContent binary, so those users get a **JIT-less WebView** — and a
  third-party app **cannot opt out** (setting `isLockdownModeEnabled = false` without Apple's
  Default Web Browser entitlement throws). For a 3D game that likely means "unplayable" for that
  population. Know it; don't design around it.
- **⚠️ The iOS Simulator JITs unconditionally.** Never benchmark there — it will flatter you
  regardless of what a real device does.

visionOS gets JIT. tvOS and watchOS do not.

## 2. Babylon Native: not a hard port — an IMPOSSIBLE one

Worth being precise, because "we could always port to Babylon Native" sounds plausible until you
look:

- **It has no `document` and no `customElements`.** Its entire browser-polyfill surface is a
  `Canvas` plus a four-method `Window`. **The framework _is_ custom elements** — `<tosi-b3d>`,
  `B3dChild`, `elementCreator`, tosijs bindings. There is nothing to port _to_. This alone ends it.
- **No headset XR** — OpenXR was deleted in May 2025.
- **Audio is unsupported** ([#1765](https://github.com/BabylonJS/BabylonNative/issues/1765) open) —
  `b3d-sound.ts` is dead on arrival.
- **Source-only public preview, no releases, explicitly unstable contract.**
- Its playground **excludes 422 tests that pass on the web** (58.9%, vs 2.7% upstream) — and the
  exclusion list reads like our dependency manifest: WaterMaterial, reflection probes with mirrors,
  CSM shadows + LODs, GlowLayer, the atmosphere variants, particle helpers, GUI panels. (Fair
  caveat: "excluded from CI" means untested, not proven broken. It is not encouraging either way.)

Babylon **React** Native, incidentally, is _alive_ (`@babylonjs/react-native` 2.0.5, 2026-05-19, on
RN 0.81 / Babylon 9) — the stale forum chatter saying otherwise is wrong. It just inherits every
blocker above (no DOM, AR-only XR, no audio, no JIT on iOS), so it solves a problem we don't have.

## 3. WebGL in WKWebView is fine

The Babylon/Tauri frame-pacing thread that looks alarming was diagnosed **by Babylon's own core
devs** as **embedder misconfiguration** (Tauri) plus a `devicePixelRatio` / render-scale mismatch —
_not_ an engine gap. WKWebView and Safari report **identical WebGL 2.0 renderer strings** (same
ANGLE-on-Metal backend). The one genuine documented regression is dated and specific: iOS 15's
default-on "GPU Process: Canvas Rendering" halved WebGL framerates in WKWebView.

**Verdict: a configuration problem, not an architectural one.** Measure it in our own app; don't
design around it.

## 4. The actual constraint is WebXR — and it is not about performance

**Tauri cannot do WebXR on any target.** Neither WKWebView nor Android's System WebView exposes it
(Chrome _for Android_ does; the WebView component is a different surface).

This is the whole shape of the distribution story, and it's less painful than it sounds:

- **Wrapping** (Tauri) gives a good **flat** 3D app on iOS, Android, Windows and Mac.
- **XR stays on the open web**, where it is a first-class citizen.

These are **two distribution stories, not one**, and neither blocks the other. We don't have to
choose.

## 5. Why we do NOT abstract the renderer

The tempting move is a `B3dRenderer` interface with Babylon as one backend. **Don't.**

Two independent investigations converged on the same seam: **what pins us to the web is the DOM and
WebXR — not Babylon.** Swapping renderers would not free us from anything. A renderer abstraction is
therefore a **permanent tax on every component we write**, levied against a benefit that does not
exist.

### Price the pure-sim split correctly

We keep the pure, Babylon-free simulation core (`fly-by-wire`, `world-store`, `ballistics`,
`guidance`, `radar`, `terrain-grid`, `atmosphere`, `ambient-budget`, `perlin-noise`, …) and the
disposable Babylon projection (`world-view.ts`). But **it is not portability insurance** — that was
a rationalisation, and an earlier draft of this thinking got it wrong.

It earns its keep for what it actually delivers:

- **determinism** (no `Date.now`, no `Math.random`; time only via `dt`/`tick`),
- **sub-second headless tests** (~400 tests, no GPU, no browser),
- and **the Ariosto driver contract** — an external narrative engine can drive a world the sim knows
  nothing about (see `world-contract.ts`).

Those are the reasons. Portability is a side effect we don't pay for and shouldn't bank on.

## 6. Store paths

| Target               | Path                                            | Cost                        |
| -------------------- | ----------------------------------------------- | --------------------------- |
| iOS / Android (flat) | Tauri v2 wrapper                                | Real but modest; **no XR**  |
| Windows / Mac (flat) | Tauri v2 wrapper                                | Modest; **no XR**           |
| XR                   | **The open web** — the platform, not a fallback | Zero                        |
| Meta Horizon Store   | PWA / Bubblewrap submission                     | Days; keeps the whole stack |

## 7. Where XR is heading (Tonio, 2026-07)

**Don't over-index on Quest.** Meta's commitment reads as waning, and the energy is moving to
**Android XR** and **Vision Pro**. This does not change the conclusion above — if anything it
_reinforces_ it, because both of those platforms ship **WebXR-capable browsers** (Chrome on Android
XR; Safari on visionOS) while every native path (Babylon Native) ships **no headset XR at all**. The
open web is the one runtime present on all of them.

The thing to watch is not rendering, it's **input**. Quest is a controller-first platform; visionOS
is **eyes-and-hands first, with no controllers at all**. A framework whose locomotion and UI assume
thumbsticks and face buttons is a framework that arrives on Vision Pro broken. Our input stack is
already abstracted the right way (`ControlInput` / `InputProvider` / `VirtualGamepad`), which means
the work is a **new provider**, not a rewrite — but the _interaction design_ (gaze + pinch, no
thumbstick locomotion) is a real design question, not a mapping exercise.

See `TODO.md` → XR for the live items, and `UI-DESIGN-NOTES.md` for the running UX log.

## Open questions

- Current WebXR status on **visionOS Safari** and **Android XR Chrome** — default-on or flagged?
  input models? store paths? (Under research; fill this in.)
- **WebGL2 stays the baseline.** Quest Browser's WebGPU is experimental; iOS 26 is a hard floor for
  WebGPU in WKWebView; Android System WebView gets it around M146. **Feature-detect `navigator.gpu`
  — never version-sniff** (the Android WebView metadata is self-contradictory).
- Does Babylon's WebXR layer need visionOS-specific workarounds?
