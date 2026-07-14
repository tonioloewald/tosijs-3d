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

## 7. Where XR is heading (Tonio, 2026-07) — and the input problem it exposes

**Don't over-index on Quest.** The energy is moving to **Android XR** and **Vision Pro**. This
_reinforces_ the web bet: all three ship **WebXR-capable browsers**, while every native path
(Babylon Native) ships **no headset XR at all**. The open web is the one runtime present on all of
them.

Meta's signal is genuinely mixed, and worth stating precisely rather than as vibes:

- **The browser is alive** — Quest Browser shipped Chromium 144/146, experimental WebGPU + WebXR
  depth projection (2026-04-21), wall anchoring (2026-05-11). No deprecation signals. The Horizon
  Store PWA path is still open.
- **The org is retreating** — Reality Labs cut ~1,500 jobs (~10%, Jan 2026), Workrooms shut down
  (Feb 2026), **Horizon Worlds VR removed from Quest after 2026-06-15**, Meta pivoting to AI.

Net: the Quest _web platform_ is maintained, but it's the platform whose corporate commitment is
**falling** while visionOS and Android XR rise. **Betting the input architecture on Quest is betting
on the wrong curve.**

### ⚠️ The real finding: we are controller-first, and visionOS has NO controllers

This is the one place the platform shift forces an **architecture** change, not a port.

|                      | **visionOS (Safari)**                                                              | **Android XR (Chrome)**               | **Quest (Browser)**             |
| -------------------- | ---------------------------------------------------------------------------------- | ------------------------------------- | ------------------------------- |
| `immersive-vr`       | ✅ default-on since visionOS 2 / Safari 18                                         | ✅ default-on                         | ✅ default-on                   |
| `immersive-ar`       | ❌ **not supported, no timeline**                                                  | ✅                                    | ✅                              |
| Primary input        | 👁️+🤏 **gaze + pinch only** (`transient-pointer`)                                  | ✋ **hands** (+ optional controllers) | 🎮 **controllers** (+ hands)    |
| Controllers in WebXR | ❌ **none** — PSVR2 Sense appear in `getGamepads()` but **not as `XRInputSource`** | ✅                                    | ✅                              |
| Hand tracking        | ✅ (permission-gated)                                                              | ✅                                    | ✅                              |
| Store path           | ❌ none found — **the app is a URL**                                               | ❓ unverified                         | ✅ Horizon Store via Bubblewrap |

**On visionOS, `session.inputSources` is EMPTY except during a pinch.** No thumbsticks, no buttons,
no triggers, no persistent ray. Our whole `VirtualGamepad` stack (`KeyboardGamepad`,
`HardwareGamepad`, `XrGamepad` → `ControlInput.forward/strafe/turn/throttle`) assumes a persistent
source reporting continuous axes every frame. On Vision Pro a stick-driven `b3dBiped` or
`b3dAircraft` receives **zero input, forever** — and the app doesn't degrade, it looks **broken**.

Four consequences, in order of how much they hurt:

1. **Locomotion cannot be thumbstick-primary.** The _canonical_ locomotion has to be **gaze/point +
   commit** (teleport arc, waypoint move, look-to-steer with pinch-to-throttle), with continuous
   stick locomotion as the **enhancement** available when a `tracked-pointer` with axes exists.
   Today it is exactly backwards. This is the genuine architectural inversion.
2. **"No persistent input source" must be a first-class state, not an error path.**
   `CompositeInputProvider` has to tolerate an empty `inputSources` and still produce usable
   `ControlInput` from transient selects. A `TransientPointerProvider` (gaze ray + pinch →
   `select`/`selectstart`/`selectend`) belongs beside `XrInputProvider`.
3. **There is no hover on visionOS — by design, for privacy.** Apple reveals gaze **only at the
   instant of pinch**. RaananW (Babylon's XR lead): _"I only know where you are looking at when you
   tap."_ So **`frame-panel`'s gaze-reveal is dead on Vision Pro**, as is any "look at it to arm it"
   affordance and any persistent ray cursor. `_attachXrPanel`'s ray→UV pick must work from a
   **transient ray fired once at pinch-start**, with no pre-select hover.
4. **Discrete actions only.** `shoot`/`interact`/`jump` map onto a pinch (`select`) fine. Hold
   duration, button combos, and any second/third button (B/X/Y) have **no visionOS mapping** —
   overflow them to the `scenePanel` spatial UI, which is already the right escape hatch and already
   picks by coordinate. (This is the "VR-reachable fallback" in the control conventions, and it just
   got load-bearing.)

**Hands + gaze-commit is the only genuinely universal input model** (all three platforms have hand
tracking). Controllers are the **platform-specific enhancement**, not the base. That is the
inversion to design toward.

**⚠️ Index-shift footgun:** with hand tracking enabled on visionOS, transient pointers land at
`inputSources[2]`/`[3]`, **not** `[0]`/`[1]` — WebKit explicitly calls this out as breaking
frameworks that assume selection comes from indices 0–1.

**⚠️ Passthrough is not cross-platform.** `immersive-ar` is structurally unavailable on Vision Pro
with no Apple timeline. Do **not** put passthrough on a critical path.

### Store strategy follows from this

The only shipping "WebXR app in a store" path is **Meta Horizon Store via Bubblewrap** — i.e. the
store path exists exactly on the platform whose commitment is weakest. On visionOS and Android XR, a
WebXR app is (as far as anyone could verify) **a URL**. So **treat the URL as the product**: fast
load, no install, deep-linkable. Store distribution is an opportunistic extra, not the plan.

See `TODO.md` → XR for the live items, and `UI-DESIGN-NOTES.md` for the running UX log.

## 8. Baselines and known quirks

- **WebGL2 is the baseline. Confirmed on all three.** WebGPU-in-WebXR is shipped only on visionOS
  (Safari 26.2, 2025-12-12), experimental on Quest, unverified on Android XR. Keep WebGPU an
  **opt-in fast path**, never a requirement — and **feature-detect `navigator.gpu`, never
  version-sniff** (the Android WebView metadata is self-contradictory).
- **Android XR is clean out of the box** — Google's own XR web docs recommend three.js and
  babylon.js by name.
- **visionOS is NOT clean.** Babylon [forum 47849](https://forum.babylonjs.com/t/webxr-hand-tracking-error-on-safari-vision-pro/47849)
  (open across Babylon 5.71 → 7.26): `enabledFeatures.indexOf` crash when enabling hand tracking on
  Vision Pro; cursor-stability problems in all pointer modes after the 7.26.3 rework ("head
  tracking" mode is the most stable). Expect visionOS-specific workarounds.

## Open questions

- Can a WKWebView wrapper enter an immersive WebXR session on visionOS at all? (Probably not —
  unverified. If not, Tauri is **definitively** flat-only, which is what we've assumed.)
- Does Android XR support PWA/TWA (Bubblewrap) distribution of a WebXR app to Play? No Google doc
  either way.
- Does Safari on visionOS support WebXR Layers? (No documentation found; assume no.)
