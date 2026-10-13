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

## 0.10.0 cycle

- **The gate blocked on the version letter only.** The work had been called a
  patch while it removed API; released as 0.10.0, no code change was needed.
  Two verified majors (draw-order sort keys recomputed inside the comparison;
  the attribute index giving one element another's defaults) were fixed with
  tests before the tag.
- **A headset freeze was found by a stack trace, after several wrong guesses.**
  Babylon's hand tracking parents the XR camera's parent to itself the second
  time hands appear. What found it was the debug sink (the page posts errors
  with stacks to the dev server); what did not was reasoning about the popup
  that happened to be open. Two of my stated causes were wrong before that.
- **Device-found fixes shipped without regression tests** (the rig guard, the
  underwater rays, the popup staying owned). Filed as #3236 with the reason:
  each needs a session or a device.
- **Process slips.** A test run was read by its last line and a red suite went
  unseen for a commit (the 0.8.3 lesson, again). release-doctor was run with
  the dev server up, against the rule. A background shell waiting on the
  server log took the server with it when stopped. Two headless page runs
  hung for hours with nothing bounding them.
- **The owner's demo pass found three biped bugs, all older than this
  release** (#3241 to #3243). The 220-page headless sweep could not have:
  it checks that pages load without throwing, not that a wall stops you.
