import { describe, expect, test } from 'bun:test'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

/*
A BINARY SOURCE FILE IS INVISIBLE TO EVERY DIFF-BASED REVIEW.

`src/picker.ts` shipped 438 lines of new public API containing one raw NUL
byte in a sentinel. That single byte made the whole file binary to git:
`git diff` reported `Bin 0 -> 13984 bytes` with ZERO hunks, so the code was
unreadable in `git log -p`, in GitHub's PR view, and to `grep` — which prints
"Binary file ... matches" and suppresses the content.

All four lenses of the pre-release review independently rediscovered the NUL
rather than reviewing the code behind it. The fix was one token (an escape is
byte-identical at runtime); the cost was a release's worth of review
attention.

So this is a TEST rather than a corrected line, following the
`import-extensions` precedent: the CLASS is what matters, and it fails at
authoring time rather than in someone's review.
*/

/**
 * Control characters that are never legitimate in source.
 *
 * Tab, newline and carriage return are excluded — they are ordinary
 * whitespace. Everything else in C0, plus DEL, makes a file binary to git or
 * hides content from a reader.
 *
 * Built with `new RegExp` from escapes rather than a literal, because a
 * literal would put the very characters this forbids into this file.
 */
// The rule exists to stop control characters reaching a regex by accident; this
// one is the check FOR them, which is the one place they belong.
const FORBIDDEN = new RegExp(
  // eslint-disable-next-line no-control-regex
  '[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F\\u007F]'
)

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory()
      ? sourceFiles(join(dir, e.name))
      : e.name.endsWith('.ts')
      ? [join(dir, e.name)]
      : []
  )

describe('source files stay diffable', () => {
  test('no control characters — one NUL makes a file binary to git', () => {
    const offenders: string[] = []
    for (const file of [...sourceFiles('src'), ...sourceFiles('bin')]) {
      const at = readFileSync(file, 'utf8').search(FORBIDDEN)
      if (at >= 0) {
        offenders.push(
          `${file}: a control character at offset ${at} — write it as an ` +
            `escape, or git treats the whole file as binary and no ` +
            `diff-based review can see the code`
        )
      }
    }
    expect(offenders).toEqual([])
  })
})
