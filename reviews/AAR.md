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

## 0.8.3 cycle

- **Correctness blocked again — the 0.8.2 lesson, one level deeper still.**
  B1: three new "live" terrain attributes reached the consumer on first
  mount but were never asserted there after a lifecycle event — a re-parent built a
  fresh plugin at its defaults while one of three sync memos still matched,
  so the values never arrived. B2: a "changes whenever the shape does" key
  was built from attributes, so property-only rebuilds were invisible. Both
  were fixed writ large (one memo object reset in one statement; a rebuild
  counter), and the tests were proven by mutation against the unfixed file.
  Written back to `practices/review.md` (tosijs-coding-practices 41ea644).
- **A red suite was committed twice.** The check read only the test COUNT
  line (`tail -1`), which says "Ran N tests" whether or not any failed; the
  schema drift gate had caught the new attributes and nobody saw it until
  the release build. Read the `N fail` line, always.
- **The bump went in "awaiting gate" and the tag waited** — the RELEASING
  allowance worked as intended: the release commit was reviewable, the
  BLOCK cost a remediation commit, not a re-tag.
