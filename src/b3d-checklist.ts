/*#
# test checklist in the scene

When an agent asks a person to check something
(`tosijs-checklist post checks.json`, from tosijs-ui), every page the dev
server serves shows a badge and a panel to answer it in. That panel is HTML, so
in a headset it is gone. This module puts the same list on a `<tosi-b3d>`'s
system bar: a ✓ button that blinks when a list arrives. It opens a panel with a
👍 and 👎 and a comment field (the scene keyboard) for each item, flat and in a
headset. Each answer is saved as it is given, through the same endpoint the
page's panel uses, so the two stay in step.

Nothing to wire. A `<tosi-b3d>` watches for a list only on a page served by a
dev server with the checklist endpoint (tosijs-ui ≥ 1.19), so a deployed site
does nothing and fetches nothing. In an app with its own server mounting
`checklistHandler`, call `setChecklistEndpoint` (from tosijs-ui's checklist
client) before the scene connects.

A verdict from the scene carries a schematic that says it was given in a scene,
and in a headset if it was: the page's own schematic draws HTML, and a headset
shows none of it.

`checklistPanel(state, handleAnswer)` builds the panel's content on its own,
for a host that places it somewhere else.
*/

/*{ "parent": "ui", "description": "The dev server's test checklist on a scene's system bar: answer an agent's list with 👍, 👎 and a comment, flat and in a headset." }*/

import {
  fetchChecklist,
  hasChecklistEndpoint,
  sendChecklistAnswer,
  type ChecklistState,
} from 'tosijs-ui/doc-system/checklist-client.js'
import { b3dPanel, type B3dPanel } from './b3d-panel.js'
import { iconGrid3d } from './icon-grid.js'
import { pager3d } from './pager-field.js'
import { inputField } from './keyboard.js'
import {
  button3d,
  label3d,
  panel3d,
  row3d,
  textBlock3d,
  type Widget3d,
} from './widgets3d.js'

export type ChecklistVerdict = 'pass' | 'fail' | null

export interface ChecklistAnswer {
  verdict: ChecklistVerdict
  comment: string
}

export interface ChecklistItemView {
  id: string
  text: string
  url?: string
  steps?: string[]
}

/** One answer changed: the item, its answer now, and which half changed. */
export interface ChecklistAnswerChange extends ChecklistAnswer {
  itemId: string
  changed: 'verdict' | 'comment'
}

type ListShape = ChecklistState['list']

/**
 * The list's sections with an id on every item. The server gives them ids
 * when a list is posted; an item without one is numbered as tosijs-ui
 * numbers it (`s1-2`), so a hand-made state reads the same.
 */
export function checklistSections(
  list: ListShape
): { title?: string; items: ChecklistItemView[] }[] {
  if (list == null) return []
  const sections = list.sections ?? (list.items ? [{ items: list.items }] : [])
  return sections.map((section, s) => ({
    title: section.title,
    items: (section.items ?? []).map((raw, i) => {
      const item = typeof raw === 'string' ? { text: raw } : raw
      return { ...item, id: item.id ?? `s${s + 1}-${i + 1}` }
    }),
  }))
}

/** Pressing a verdict gives it; pressing the one already given takes it back. */
export const nextVerdict = (
  current: ChecklistVerdict,
  pressed: 'pass' | 'fail'
): ChecklistVerdict => (current === pressed ? null : pressed)

/** Passed, failed and still to check, as the page's panel counts them. */
export function checklistCounts(
  list: ListShape,
  answers: Record<string, ChecklistAnswer>
): { pass: number; fail: number; open: number } {
  let pass = 0
  let fail = 0
  let total = 0
  for (const section of checklistSections(list))
    for (const item of section.items) {
      total++
      const v = answers[item.id]?.verdict
      if (v === 'pass') pass++
      else if (v === 'fail') fail++
    }
  return { pass, fail, open: total - pass - fail }
}

const summaryOf = (c: { pass: number; fail: number; open: number }) =>
  c.pass + c.fail + c.open === 0
    ? 'Nothing to check'
    : `${c.pass} passed · ${c.fail} failed · ${c.open} to check`

/** A site path: what the scene's panel will open (it leaves the page). */
const sitePath = (url?: string) =>
  url != null && url.startsWith('/') && !url.startsWith('//')

/**
 * The checklist as a panel, ONE ITEM AT A TIME (a panel scrolls badly under a
 * controller ray): the list's title and count, a pager whose dots are green
 * for passed and red for failed, then the item: its section, text, steps,
 * 👍 / 👎 and a comment. It opens on the first item still to check.
 * `handleAnswer` gets every change; the panel keeps its own answers as they
 * are given, and turning a page rebuilds it in place (`handleReplace`, as a
 * panel's folding does). Answers given elsewhere go in with the returned
 * element's `setAnswers(answers)`, which updates what is shown in place (a
 * comment being typed keeps its caret) and reports nothing.
 */
export function checklistPanel(
  state: { list: ListShape; answers: Record<string, ChecklistAnswer> },
  handleAnswer: (change: ChecklistAnswerChange) => void,
  options: {
    width?: number
    page?: number
    /** The item shown changed (to keep it across a rebuild). */
    handlePage?: (page: number) => void
  } = {}
): SVGSVGElement & {
  setAnswers: (answers: Record<string, ChecklistAnswer>) => void
} {
  const answers: Record<string, ChecklistAnswer> = { ...state.answers }
  // What the page shown is drawing, for `setAnswers`.
  let shown: {
    summary: ReturnType<typeof textBlock3d>
    pager: ReturnType<typeof pager3d>
    verdicts?: ReturnType<typeof iconGrid3d>
    comment?: ReturnType<typeof inputField>
  }
  let applying = false
  const answerOf = (id: string): ChecklistAnswer =>
    answers[id] ?? { verdict: null, comment: '' }
  const items = checklistSections(state.list).flatMap((section) =>
    section.items.map((item) => ({ ...item, section: section.title }))
  )
  const firstOpen = items.findIndex((i) => answerOf(i.id).verdict == null)
  let page = options.page ?? Math.max(0, firstOpen)
  // The host keeps it, so a rebuild for answers given elsewhere stays here.
  options.handlePage?.(page)

  type Shown = SVGSVGElement & { setAnswers: typeof setAnswers }
  const build = (): Shown => {
    const summary = textBlock3d({
      lines: [summaryOf(checklistCounts(state.list, answers))],
      muted: true,
    })
    const pager = pager3d({
      count: items.length,
      index: page,
      name: 'item',
      dotColor: (i) => {
        const v = answerOf(items[i].id).verdict
        return v === 'pass' ? PASS : v === 'fail' ? FAIL : undefined
      },
      handleChange: (i) => {
        page = i
        options.handlePage?.(i)
        const next = build()
        ;(current as any).handleReplace?.(next)
        current = next
      },
    })
    const set = (
      id: string,
      next: ChecklistAnswer,
      changed: 'verdict' | 'comment'
    ) => {
      answers[id] = next
      summary.update([summaryOf(checklistCounts(state.list, answers))])
      pager.refresh()
      if (!applying) handleAnswer({ itemId: id, ...next, changed })
    }
    const widgets: Widget3d[] = [
      label3d({ text: state.list?.title ?? 'Test checklist', bold: true }),
      summary,
    ]
    shown = { summary, pager }
    const item = items[page]
    if (item != null) {
      widgets.push(pager)
      if (item.section)
        widgets.push(
          label3d({ text: item.section, muted: true, compact: true })
        )
      widgets.push(textBlock3d({ lines: [item.text] }))
      if (item.steps?.length)
        widgets.push(
          textBlock3d({
            lines: item.steps.map((s, i) => `${i + 1}. ${s}`),
            muted: true,
          })
        )
      const verdict = answerOf(item.id).verdict
      const verdicts = iconGrid3d({
        mode: 'checkbox',
        columns: 2,
        // A verdict is the thing to hit: as big as a touch target everywhere.
        cellSize: 40,
        selected: verdict === 'pass' ? [0] : verdict === 'fail' ? [1] : [],
        items: [
          { icon: 'thumbsUp', title: `passes: ${item.text}` },
          { icon: 'thumbsDown', title: `fails: ${item.text}` },
        ],
        // At most one: the one pressed, or none when it was already on.
        handleChange: ({ index }) => {
          const next = nextVerdict(
            answerOf(item.id).verdict,
            index === 0 ? 'pass' : 'fail'
          )
          set(item.id, { ...answerOf(item.id), verdict: next }, 'verdict')
          return next === 'pass' ? [0] : next === 'fail' ? [1] : []
        },
      })
      widgets.push(
        sitePath(item.url)
          ? row3d(
              { weights: [1, 1] },
              verdicts,
              button3d({
                label: 'open',
                title: `open ${item.url}`,
                handleClick: () => {
                  location.href = item.url!
                },
              })
            )
          : verdicts
      )
      const comment = inputField({
        value: answerOf(item.id).comment,
        placeholder: 'comment (optional)',
        name: `comment on: ${item.text}`,
        lines: 4,
        handleChange: (text) =>
          set(item.id, { ...answerOf(item.id), comment: text }, 'comment'),
      })
      widgets.push(comment)
      shown.verdicts = verdicts
      shown.comment = comment
    }
    const svg = panel3d(
      { width: options.width ?? 360 },
      ...widgets
    ) as unknown as Shown
    svg.setAnswers = setAnswers
    return svg
  }
  const setAnswers = (next: Record<string, ChecklistAnswer>) => {
    for (const id of Object.keys(next)) answers[id] = next[id]
    shown.summary.update([summaryOf(checklistCounts(state.list, answers))])
    shown.pager.refresh()
    const item = items[page]
    if (item == null) return
    const { verdict, comment } = answerOf(item.id)
    const selection = verdict === 'pass' ? [0] : verdict === 'fail' ? [1] : []
    if (shown.verdicts?.selection.join() !== selection.join())
      shown.verdicts?.setSelection(selection)
    // An unchanged comment is left alone, caret and all.
    applying = true
    try {
      shown.comment?.setValue(comment)
    } finally {
      applying = false
    }
  }
  let current = build()
  return current
}

const PASS = '#30d158'
const FAIL = '#ff453a'

/** What a verdict given in a scene says about where it was given. */
function sceneSchematic(xr: boolean): string {
  const where = xr ? 'in a headset' : 'in a 3D scene'
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 40">` +
    `<text x="8" y="26" font-size="16">answered ${where} (tosijs-3d)</text></svg>`
  )
}

interface ChecklistHost extends HTMLElement {
  xrActive?: boolean
}

const POLL_MS = 15_000
/** While the scene's panel is open: answers from another device show soon. */
const OPEN_POLL_MS = 3_000
const COMMENT_PAUSE_MS = 600

/** Answers as the panel reads them: a verdict and a comment, nothing else. */
const answersKey = (answers: Record<string, ChecklistAnswer>): string =>
  JSON.stringify(
    Object.keys(answers)
      .sort()
      .map((id) => [
        id,
        answers[id]?.verdict ?? null,
        answers[id]?.comment ?? '',
      ])
  )

/** The page's own checklist panels (tosijs-ui's `<tosi-checklist>`). */
const pageChecklists = (): (HTMLElement & {
  answers: Record<string, ChecklistAnswer>
})[] => [...document.querySelectorAll('tosi-checklist')] as any

/**
 * Watch for a test checklist and keep a system-bar button for it on `host`
 * while one is waiting. Returns the way to stop. Does nothing (and fetches
 * nothing) unless the page was served with a checklist endpoint, or inside a
 * frame (a test runner's), where nobody answers.
 */
export function watchSceneChecklist(host: ChecklistHost): () => void {
  if (typeof window === 'undefined' || window.top !== window) return () => {}
  if (!hasChecklistEndpoint()) return () => {}
  let stopped = false
  let panel: B3dPanel | null = null
  let shownId: string | null = null
  let shownAnswers = ''
  let content: ReturnType<typeof checklistPanel> | null = null
  let page: number | undefined
  // Comments wait out a pause in typing; a verdict goes at once.
  const typing = new Map<string, ReturnType<typeof setTimeout>>()
  /*
  Answers given here and not yet seen saved win over the server's copy (the
  rule the page's panel keeps), so a poll that left before a change was sent
  cannot put the old answer back.
  */
  const unsaved = new Map<string, ChecklistAnswer>()
  let sending: Promise<unknown> = Promise.resolve()
  const send = (listId: string, change: ChecklistAnswerChange) => {
    sending = sending.then(async () => {
      await sendChecklistAnswer({
        listId,
        itemId: change.itemId,
        verdict: change.verdict,
        comment: change.comment,
        page: location.href,
        ...(change.changed === 'verdict'
          ? { schematic: sceneSchematic(!!host.xrActive) }
          : {}),
      })
      const kept = unsaved.get(change.itemId)
      if (
        !typing.has(change.itemId) &&
        kept?.verdict === change.verdict &&
        kept?.comment === change.comment
      )
        unsaved.delete(change.itemId)
    })
  }
  const show = (state: ChecklistState) => {
    const list = state.list!
    if (shownId !== list.id) {
      page = undefined
      unsaved.clear()
    }
    content = checklistPanel(
      state,
      (change) => {
        // Ours from now on: the next poll need not rebuild for it.
        state.answers = {
          ...state.answers,
          [change.itemId]: { verdict: change.verdict, comment: change.comment },
        }
        shownAnswers = answersKey(state.answers)
        unsaved.set(change.itemId, {
          verdict: change.verdict,
          comment: change.comment,
        })
        // The page's panel shows it at once (it would wait for its own poll).
        // It never overwrites a comment box with focus, and whoever is
        // answering here is not typing there.
        for (const el of pageChecklists()) {
          const active = el.shadowRoot?.activeElement as HTMLElement | null
          if (active?.localName === 'textarea') active.blur()
          el.answers = {
            ...el.answers,
            [change.itemId]: {
              verdict: change.verdict,
              comment: change.comment,
            },
          }
        }
        clearTimeout(typing.get(change.itemId))
        if (change.changed === 'verdict') send(list.id, change)
        else
          typing.set(
            change.itemId,
            setTimeout(() => {
              typing.delete(change.itemId)
              send(list.id, change)
            }, COMMENT_PAUSE_MS)
          )
      },
      { page, handlePage: (p) => (page = p) }
    )
    if (panel == null) {
      panel = b3dPanel({ icon: 'checkSquare', title: 'Test checklist' })
      panel.svg = content!
      host.append(panel)
    } else panel.svg = content!
    if (shownId !== list.id) panel.attention?.()
    shownId = list.id
    shownAnswers = answersKey(state.answers)
  }
  const refresh = async () => {
    const state = await fetchChecklist()
    if (stopped) return
    if (state?.list == null) {
      panel?.remove()
      panel = null
      shownId = null
      return
    }
    // Built for a new list; answers given elsewhere (the page's panel,
    // another device) go into the one shown, in place.
    if (state.list.id !== shownId || content == null) {
      show(state)
      return
    }
    const answers = { ...state.answers, ...Object.fromEntries(unsaved) }
    const key = answersKey(answers)
    if (key === shownAnswers) return
    shownAnswers = key
    content.setAnswers(answers)
  }
  void refresh()
  // Every 3 s while the scene's panel is open, every 15 s otherwise.
  let since = 0
  const timer = setInterval(() => {
    since += OPEN_POLL_MS
    if (document.visibilityState !== 'visible') return
    if (panel?.isOpen || since >= POLL_MS) {
      since = 0
      void refresh()
    }
  }, OPEN_POLL_MS)
  // An answer in the page's panel: read it back once it has been sent.
  let soon: ReturnType<typeof setTimeout> | undefined
  const pageAnswered = (event: Event) => {
    if ((event.target as Element | null)?.localName !== 'tosi-checklist') return
    clearTimeout(soon)
    soon = setTimeout(() => void refresh(), 900)
  }
  document.addEventListener('change', pageAnswered)
  return () => {
    stopped = true
    clearInterval(timer)
    clearTimeout(soon)
    document.removeEventListener('change', pageAnswered)
    for (const t of typing.values()) clearTimeout(t)
    panel?.remove()
    panel = null
  }
}
