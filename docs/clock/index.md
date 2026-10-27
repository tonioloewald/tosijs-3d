# clock

**Game code does not read the wall clock.** Time in a simulation comes from
the simulation: `sceneDelta(scene)` for a frame's step and `sceneSeconds(scene)`
for animation, both of which stop when the world is paused, slow with its
`timeScale`, and run the same way in a test or a replay. Code that reads the
system clock instead keeps going through a pause, ignores the time scale, and
behaves differently every run.

This module is the ONE place the system clock may be read, so every use is a
named call a review can find (`clock.test.ts` fails on a read anywhere else).
What is left to it is time that really is real:

- `realNow()`: monotonic milliseconds, for measuring how long work took
  (profiling, budgets), spacing out work that is not part of the world
  (debounces, retries), and UI that must move in a pause menu
- `wallMs()` / `wallDate()`: the calendar, for timestamps on logs, files and
  caches

If you are about to call one of these from something that lives in the world
(a projectile, an animation, an AI's patience), you want the scene's clock.
