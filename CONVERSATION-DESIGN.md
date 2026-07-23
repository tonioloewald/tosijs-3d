# Conversation design — talking to NPCs without the boredom

The SIM-lane spec for MVP conversation. Ariosto owns **what is said** (dialogue trees, branches,
the choice content, the chronicle); tosijs-3d owns **how it is staged** — panels, audio, camera,
animation, turn-taking. The seam is the contract's choice primitive
(`presentChoice`/`choiceMade`) plus the baked speech pipeline (`bin/bake-speech.ts` → `assetUrl` →
`b3d-sound`).

## North star — never freeze the player, never a mannequin NPC

The reason dialogue in most RPGs is boring-as-fuck is a specific, avoidable failure: **frozen
player + static camera + mannequin NPC + a menu you have to read.** Rockstar's walk-and-talks feel
alive because none of that happens. So bake the opposite into the CORE, not as polish:

- **The player is never frozen** unless they chose to stand and talk. Comms keeps you flying;
  walk-and-talk keeps you walking.
- **The NPC is never a mannequin** — a "chatting" idle loop, procedural **look-at** (aim the
  head/neck at the player; no clip needed), and gesture clips are part of the _conversing state_,
  always on.
- **Barge-in beats menus.** Response options appear while the current line is still finishing, and
  picking one cuts the tail — a real conversation, not a wait-then-read-then-pick interlude.

## One core, three stagings

Do NOT build three dialogue systems. Build one playback core and swap the staging.

**The core (mode-agnostic):** a turn stream from the narrative side — `[{ speaker, line, gesture? }]`
plus choice points — that the sim plays back:

1. play the line's **baked audio** on the speaker's channel; show a **glanceable caption** (audio
   carries it — the caption reinforces, it is not a wall to read);
2. when the line is **"somewhat complete"** (~75–80% through, or a fixed ~0.7 s before the end —
   computable from the clip duration/timing the bake captures), fade in the **response options**;
3. on a pick: **cut the current line** (a fast fade, not a hard chop) **if it is interruptible** →
   play the **player's voiced line** → play the **NPC's reply**. Loop.

**The staging (mode-specific):**

|             | (a) face-to-face                                    | (b) comms                                             | (c) walk-and-talk                   |
| ----------- | --------------------------------------------------- | ----------------------------------------------------- | ----------------------------------- |
| speaker     | NPC biped in scene                                  | voice only / HUD portrait                             | NPC biped, moving with you          |
| balloon     | world panel above the head (billboarded)            | HUD panel                                             | world panel, tracks the moving NPC  |
| audio       | positional (NPC head)                               | 2-D + a **radio filter** (Web Audio bandpass/crackle) | positional, moving                  |
| camera      | conversation framing (`setGameplayCamera`, XR-safe) | unchanged                                             | unchanged (gameplay)                |
| NPC motion  | stands, faces you                                   | —                                                     | **paces you** (steering)            |
| animation   | chatting loop + gesture + look-at                   | —                                                     | walk + chatting + gesture + look-at |
| player      | soft-lock _optional_                                | keeps flying                                          | keeps walking                       |
| no-response | options wait                                        | timeout → NPC rings off                               | timeout → NPC carries on            |

## Presentation — the balloon panel

An NPC line is a **speech-balloon panel** built on the existing panel system
(`b3d-svg-plane`/`frame-panel`), anchored above the NPC's head and billboarded toward the camera;
in comms it stages as a HUD panel (`b3d-hud`) instead — same panel abstraction, different frame.
It shows the caption and, once the line is "somewhat complete," the terse response buttons
(`widgets3d` `button3d`s). Gesture clips (`b3d-biped`) fire at conversation beats — before a line,
after it, or at an audio timing-mark — blended over the chatting idle. **Gesture-at-beat is MVP**
(just an animation trigger); facial lip-sync from visemes is the deferred future direction (see
`TODO.md` → Speech).

## Voiced player, terse options

The player is **voiced too** — chosen options are baked lines like any character (a protagonist
voice). This forces a distinction:

- an option carries a terse **label** (what you glance at and click) and a **line** (what is
  spoken/baked). For the tersest options the label _is_ the line.
- **Both stay terse** (the Ariosto authoring hint): nobody wants to read a paragraph to pick, and
  nobody wants to hear their own character give a speech — least of all mid-stride in a walk-and-talk.

## Transcripts — a sim-side presentation log

The conversation driver **played every line**, so it already holds the record: `{ lineId, speaker,
text, audioAsset, at }`. So the reviewable transcript is a **pure sim-side presentation log** — no
narrative round-trip — and "audio playback on request" is trivial (the clip is right there via
`assetUrl`). A transcript panel is a `list3d` of past turns, each replayable.

**Don't make players read** holds three ways: glanceable captions, audio-first delivery, and a
transcript that _replays_ rather than only shows.

This is deliberately **separate** from Ariosto's chronicle, which records what the conversation
_meant_ (standing/regard/deeds). Different record, different job — do not try to unify them.

## Interruptibility

Per-line, default **interruptible: true**. Most lines barge-out fine on a fast fade; a punchline or
a critical reveal is marked `interruptible: false` so a pick waits for it to land. That is what
"cut the previous thing, _if appropriate_" means, made concrete.

## Composition & build order

`b3d-conversation` (SIM-side driver) = balloon (panel system) + audio (`b3d-sound`) + the choice
primitive (contract) + a transcript log/review panel + the barge-in turn-taking state machine —
staged three ways. Pure composition of existing atoms.

Order, by dependency:

1. **(b) comms first** — lightest: no biped, no camera change; new work is only the radio filter
   and a non-blocking quick-choice. High value for the plane, exercises the whole core with the
   fewest moving parts.
2. **(a) face-to-face** — adds the _conversing_ animation state (chatting idle + look-at + gesture)
   and the conversation camera. This is where the **animation-pipeline** work bites (a chatting
   idle + a few gesture clips on the rig; look-at is procedural).
3. **(c) walk-and-talk last** — _requires the NPC-movement work_ (`B-SIM-2`, the autonomy loop /
   `guidance.ts steerToward`, to pace the player) plus a walk+talk animation blend. It rides on the
   SIM-lane movement work, so it cannot lead.
