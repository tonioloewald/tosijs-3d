/*
A SCREEN READER'S VIEW OF A PAGE, driven like one: headless Chrome, nothing
but the accessibility tree to read and real key presses to act. After every
step it prints what a screen reader would announce for the focused control
(role, name, value, state), so a transcript reads like a VoiceOver session.

  bun bin/screen-reader.ts <path> --steps "find:button:Settings, Space, Tab, read"
                           [--steps-file f.txt] [--wait ms] [--out dir]

Steps (comma separated, or one a line in a steps file):

  Tab  Shift+Tab  Space  Enter  Escape  ArrowUp/Down/Left/Right  Home  End
                     a real key press (Input.dispatchKeyEvent): focus moves
                     the way it does for a person, not by script
  find:<role>:<name> jump to a control by role and name, as a screen reader's
                     rotor does (`find:switch:night`, `find:heading:Sky`)
  tap:<role>:<name>  iOS VoiceOver's double-tap: the control is selected
                     (focused), then touched at its centre; says so when the
                     touch lands on something else (pointer-events: none)
  read[:<name>]      read out a region (default: the first region whose name
                     ends in "settings"), one line per control
  type:<text>        type into the focused field
  ax                 the focused node as Chrome exposes it, raw
  wait:<ms>          let the page catch up
  eval:<js>          a check on the page's state; its value is printed (this is
                     the test's eye, not the reader's: use it to confirm a
                     control did what it announced)

It reads and acts only through what Chrome exposes to assistive technology,
so a control that works here is one a screen reader can find, name and use.
It is not VoiceOver: how a real reader phrases things, and its own navigation
quirks, still want a person once.
*/

import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { mkdirSync } from 'node:fs'

const args = process.argv.slice(2)
const flag = (name: string): string | undefined => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? args[i + 1] : undefined
}
const path = args.find(
  (a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--')
)
if (path == null) {
  console.log(
    'usage: bun bin/screen-reader.ts <path> --steps "find:button:Settings, Space, Tab, read"'
  )
  process.exit(1)
}
const url = /^https?:/.test(path) ? path : `https://localhost:8030${path}`
const outDir = flag('out') ?? join(tmpdir(), 'screen-reader')
mkdirSync(outDir, { recursive: true })
// A steps file is one step a line (so an eval may hold commas); --steps is
// comma separated.
const stepsFile = flag('steps-file')
const stepsRaw: string[] =
  stepsFile != null
    ? (await Bun.file(stepsFile).text()).split('\n')
    : (flag('steps') ?? 'read').split(',')
const steps = stepsRaw
  .map((s) => s.trim())
  .filter((s) => s !== '' && !s.startsWith('#'))

const KEYS: Record<string, { code: string; vk: number; text?: string }> = {
  Tab: { code: 'Tab', vk: 9 },
  Enter: { code: 'Enter', vk: 13, text: '\r' },
  Space: { code: 'Space', vk: 32, text: ' ' },
  Escape: { code: 'Escape', vk: 27 },
  ArrowLeft: { code: 'ArrowLeft', vk: 37 },
  ArrowUp: { code: 'ArrowUp', vk: 38 },
  ArrowRight: { code: 'ArrowRight', vk: 39 },
  ArrowDown: { code: 'ArrowDown', vk: 40 },
  Home: { code: 'Home', vk: 36 },
  End: { code: 'End', vk: 35 },
}

const port = 9700 + Math.floor(Math.random() * 200)
const chrome = Bun.spawn(
  [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${join(outDir, 'profile')}`,
    '--use-angle=metal',
    '--enable-gpu',
    '--ignore-gpu-blocklist',
    '--window-size=1400,800',
    '--ignore-certificate-errors',
    // Chrome builds the accessibility tree only when something asks for it.
    '--force-renderer-accessibility',
    'about:blank',
  ],
  { stdout: 'ignore', stderr: 'ignore' }
)
// A killed session must not leave a GPU process running.
const watchdog = setTimeout(() => chrome.kill(), 240000)
let failed = false

try {
  for (let i = 0; i < 40; i++) {
    try {
      await fetch(`http://127.0.0.1:${port}/json/version`)
      break
    } catch {
      await Bun.sleep(500)
    }
  }
  const target = (await (
    await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, {
      method: 'PUT',
    })
  ).json()) as { webSocketDebuggerUrl: string }
  const ws = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((r) => (ws.onopen = r))
  let id = 0
  const pending = new Map<number, (m: any) => void>()
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data as string)
    pending.get(m.id)?.(m)
    pending.delete(m.id)
  }
  // Every call answers within 20 s, or the run says which call hung.
  const send = (method: string, params = {}) =>
    new Promise<any>((r) => {
      const my = ++id
      const timer = setTimeout(() => {
        pending.delete(my)
        console.log(`  ⏱  ${method} did not answer`)
        failed = true
        r({})
      }, 20000)
      pending.set(my, (m) => {
        clearTimeout(timer)
        r(m)
      })
      ws.send(JSON.stringify({ id: my, method, params }))
    })
  const evaluate = async (expression: string, byValue = true) => {
    const r = await send('Runtime.evaluate', {
      expression,
      returnByValue: byValue,
      awaitPromise: true,
    })
    if (r.result?.exceptionDetails)
      throw new Error(
        r.result.exceptionDetails.exception?.description ??
          r.result.exceptionDetails.text
      )
    return r.result?.result
  }

  await send('Runtime.enable')
  await send('DOM.enable')
  await send('Accessibility.enable')
  // A headless page has no window focus, and an unfocused page fires no
  // focus events: a person's page has it.
  await send('Emulation.setFocusEmulationEnabled', { enabled: true })
  await send('Page.navigate', { url })

  // Until a scene is up (a live example mounts some time after load).
  for (let i = 0; i < 120; i++) {
    const up = await evaluate(
      `(() => { const deep = (r) => { const b = r.querySelector('tosi-b3d'); if (b) return b; for (const e of r.querySelectorAll('*')) if (e.shadowRoot) { const f = deep(e.shadowRoot); if (f) return f } return null }; const b = deep(document); return !!(b && b.scene && b.parts?.scenePanelGear && !b.parts.scenePanelGear.disabled) })()`
    )
    if (up?.value === true) break
    await Bun.sleep(500)
  }
  await Bun.sleep(1500)

  type AXNode = {
    nodeId: string
    ignored: boolean
    role?: { value: string }
    name?: { value: string }
    value?: { value: unknown }
    properties?: { name: string; value: { value: unknown } }[]
    childIds?: string[]
    backendDOMNodeId?: number
  }
  const prop = (n: AXNode, k: string) =>
    n.properties?.find((p) => p.name === k)?.value.value
  /** What a screen reader says for a node. */
  const announce = (n: AXNode): string => {
    const role = n.role?.value ?? '?'
    const name = n.name?.value ?? ''
    const bits = [role, name === '' ? '(no name)' : JSON.stringify(name)]
    // What a reader speaks for a value: its text form when it has one.
    const value = prop(n, 'valuetext') ?? n.value?.value
    if (value !== undefined && value !== '') bits.push(`value ${value}`)
    const checked = prop(n, 'checked')
    if (checked !== undefined) bits.push(checked === 'true' ? 'on' : 'off')
    const pressed = prop(n, 'pressed')
    if (pressed !== undefined) bits.push(pressed === 'true' ? 'pressed' : '')
    const expanded = prop(n, 'expanded')
    if (expanded !== undefined) bits.push(expanded ? 'expanded' : 'collapsed')
    if (prop(n, 'disabled')) bits.push('dimmed')
    const min = prop(n, 'valuemin')
    const max = prop(n, 'valuemax')
    if (min !== undefined && max !== undefined) bits.push(`${min} to ${max}`)
    return bits.filter((b) => b !== '').join(', ')
  }
  const focusedNode = async (): Promise<AXNode | null> => {
    const r = await evaluate(
      `(() => { let a = document.activeElement; while (a && a.shadowRoot && a.shadowRoot.activeElement) a = a.shadowRoot.activeElement; return a })()`,
      false
    )
    if (r?.objectId == null) return null
    const t = await send('Accessibility.getPartialAXTree', {
      objectId: r.objectId,
      fetchRelatives: false,
    })
    return (t.result?.nodes?.[0] as AXNode) ?? null
  }
  const fullTree = async (): Promise<Map<string, AXNode>> => {
    const t = await send('Accessibility.getFullAXTree')
    const m = new Map<string, AXNode>()
    for (const n of (t.result?.nodes ?? []) as AXNode[]) m.set(n.nodeId, n)
    return m
  }
  const say = (s: string) => console.log(`  🔊 ${s}`)

  for (const step of steps) {
    console.log(`> ${step}`)
    const [cmd, ...rest] = step.split(':')
    const arg = rest.join(':')
    if (KEYS[cmd.replace('Shift+', '')] != null) {
      const k = KEYS[cmd.replace('Shift+', '')]
      const modifiers = cmd.startsWith('Shift+') ? 8 : 0
      const base = {
        key: k.code === 'Space' ? ' ' : k.code,
        code: k.code,
        windowsVirtualKeyCode: k.vk,
        modifiers,
      }
      await send('Input.dispatchKeyEvent', {
        type: 'keyDown',
        ...base,
        ...(k.text ? { text: k.text } : {}),
      })
      await send('Input.dispatchKeyEvent', { type: 'keyUp', ...base })
      await Bun.sleep(500)
      const n = await focusedNode()
      say(n ? announce(n) : 'nothing focused')
    } else if (cmd === 'find') {
      const [role, ...nameParts] = arg.split(':')
      const name = nameParts.join(':')
      const tree = await fullTree()
      const hits = [...tree.values()].filter(
        (n) =>
          !n.ignored &&
          n.role?.value === role &&
          (name === '' || n.name?.value === name)
      )
      if (hits.length === 0) {
        say(`no ${role} named ${JSON.stringify(name)}`)
        failed = true
        continue
      }
      if (hits.length > 1) say(`(${hits.length} matches, taking the first)`)
      await send('DOM.focus', { backendNodeId: hits[0].backendDOMNodeId })
      await Bun.sleep(300)
      const n = await focusedNode()
      say(n ? announce(n) : announce(hits[0]) + ' (could not take focus)')
    } else if (cmd === 'tap') {
      // iOS VoiceOver's double-tap: the control is selected (it takes focus),
      // then a touch lands at its centre and goes to whatever is THERE. A
      // control that takes no pointer events there is never pressed.
      const [role, ...nameParts] = arg.split(':')
      const name = nameParts.join(':')
      const tree = await fullTree()
      const hit = [...tree.values()].find(
        (n) =>
          !n.ignored &&
          n.role?.value === role &&
          (name === '' || n.name?.value === name)
      )
      if (hit == null) {
        say(`no ${role} named ${JSON.stringify(name)}`)
        failed = true
        continue
      }
      await send('DOM.focus', { backendNodeId: hit.backendDOMNodeId })
      await Bun.sleep(200)
      const objectId = (
        await send('DOM.resolveNode', { backendNodeId: hit.backendDOMNodeId })
      ).result?.object?.objectId
      const c = (
        await send('Runtime.callFunctionOn', {
          objectId,
          functionDeclaration: `function () {
            // Selecting can rebuild a mirror, which focuses the control's
            // replacement: touch that one.
            let me = this
            if (!me.isConnected) {
              me = document.activeElement
              while (me?.shadowRoot?.activeElement) me = me.shadowRoot.activeElement
            }
            me.scrollIntoView({ block: 'center', inline: 'center' })
            const r = me.getBoundingClientRect()
            const x = r.left + r.width / 2
            const y = r.top + r.height / 2
            let at = document.elementFromPoint(x, y)
            while (at?.shadowRoot) {
              const deeper = at.shadowRoot.elementFromPoint(x, y)
              if (deeper == null || deeper === at) break
              at = deeper
            }
            return { x, y, self: at === me || me.contains(at),
              at: at ? at.tagName.toLowerCase() + (at.getAttribute('part') ? '[' + at.getAttribute('part') + ']' : '') : 'nothing' }
          }`,
          returnByValue: true,
        })
      ).result?.result?.value
      const at = { x: c.x, y: c.y, button: 'left', clickCount: 1 }
      await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...at })
      await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...at })
      await Bun.sleep(500)
      say(
        c.self
          ? `tapped ${announce(hit)}`
          : `tapped ${announce(hit)}, but the touch went to ${c.at}`
      )
    } else if (cmd === 'read') {
      const tree = await fullTree()
      const region = [...tree.values()].find(
        (n) =>
          !n.ignored &&
          n.role?.value === 'region' &&
          (arg === ''
            ? /settings$/.test(String(n.name?.value ?? ''))
            : n.name?.value === arg)
      )
      if (region == null) {
        say('no such region')
        failed = true
        continue
      }
      say(`region, ${JSON.stringify(region.name?.value)}`)
      const walk = (n: AXNode, depth: number) => {
        for (const c of n.childIds ?? []) {
          const child = tree.get(c)
          if (child == null) continue
          const role = child.role?.value
          // Text runs and generic wrappers are not stops a reader makes.
          const skip =
            child.ignored ||
            role === 'StaticText' ||
            role === 'InlineTextBox' ||
            role === 'generic' ||
            role === 'none' ||
            role === 'LabelText'
          if (!skip) console.log(`  ${'  '.repeat(depth)}· ${announce(child)}`)
          walk(child, skip ? depth : depth + 1)
        }
      }
      walk(region, 1)
    } else if (cmd === 'type') {
      await send('Input.insertText', { text: arg })
      await Bun.sleep(300)
      const n = await focusedNode()
      say(n ? announce(n) : 'nothing focused')
    } else if (cmd === 'ax') {
      // The focused node as Chrome exposes it, raw: for checking the reader.
      console.log(JSON.stringify(await focusedNode(), null, 1))
    } else if (cmd === 'wait') {
      await Bun.sleep(Number(arg) || 500)
    } else if (cmd === 'eval') {
      const r = await evaluate(arg)
      console.log(`  👁  ${JSON.stringify(r?.value)}`)
    } else {
      console.log(`  ? unknown step "${step}"`)
      failed = true
    }
  }
  const s = await send('Page.captureScreenshot', { format: 'png' })
  const file = join(outDir, 'screen-reader.png')
  await Bun.write(file, Buffer.from(s.result.data, 'base64'))
  console.log(`  ${file}`)
} catch (e) {
  console.error(e)
  failed = true
} finally {
  clearTimeout(watchdog)
  chrome.kill()
}
process.exit(failed ? 1 : 0)
