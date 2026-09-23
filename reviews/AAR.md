
## 0.8.2 cycle

- **The gate blocked twice on the same class of bug, one level deeper each
  time.** The release folded a near-miss (a duplicated test import caught
  only by the whole-repo typecheck) and then a real blocker (B1: a
  "live" attribute read only at material creation — the shader never saw
  the value). Both are the same shape: a value is written somewhere the
  reader never reads, and nothing in the test suite reads the READER.
  Lesson: when a bug is "fixed" by wiring a value to an element, the fix
  is not complete until a test asserts the value at the CONSUMER — the
  uniform, the params, the shader-visible state.
- **The follow-up volume was inflated by unverified minors on the report's
  own measurements** — the size-figure and CLAUDE.md-time items exist
  because docs quote remembered numbers. Where the report measured, it said
  so; where the docs didn't, the gate spent a finding. Pin derived numbers
  in code or a test (scene-schemas' drift test is the pattern).
