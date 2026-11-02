/*
THE REPORT: the sweep's numbers turned into verdicts and a page.

An item FAILS on a body when more of it shows through the skin than a
viewer would forgive: more than `FAIL_FRACTION` of its vertices visibly
inside (deeper than the skin is tucked there), and more than
`FAIL_MIN_VERTICES` of them (one stray vertex is not a broken fit). Its
verdict over the sweep:

- `holds`: it fails on no body;
- `fails-at-extremes`: it is fine on the default body and fails on some;
- `broken-at-default`: it fails on the default body already, so the
  extremes are not what is wrong with it.

Pure.
*/

import type { Corner } from './extremes-corners.js'
import type { SweepItem, SweepResult } from './extremes-sweep.js'

export const FAIL_FRACTION = 0.002
export const FAIL_MIN_VERTICES = 3

export type Verdict = 'holds' | 'fails-at-extremes' | 'broken-at-default'

export interface ItemSummary {
  item: SweepItem
  vertices: number
  verdict: Verdict
  /** Bodies it fails on, of all swept. */
  failing: number
  bodies: number
  atDefault: { visible: number; depth: number }
  worst: {
    corner: string
    visible: number
    fraction: number
    depth: number
    rawDepth: number
  }
}

export interface WorstCase {
  item: string
  corner: string
  visible: number
  fraction: number
  depth: number
}

export interface BoneSummary {
  kind: string
  joint: string
  bodies: number
  worst: { corner: string; detail: string }
}

export interface SweepSummary {
  thresholds: { fraction: number; minVertices: number; toleranceMm: number }
  bodies: number
  items: ItemSummary[]
  worstCases: WorstCase[]
  /** Bodies by how many items fail on them. */
  hardestBodies: Array<{ corner: string; group: string; failing: number }>
  bones: BoneSummary[]
  boneBaseline: string[]
  /** Clothes that hold up, CC0, by slot: the starter-wardrobe pool. */
  candidates: Record<string, string[]>
}

export const fails = (visible: number, vertices: number): boolean =>
  visible > FAIL_MIN_VERTICES && visible > FAIL_FRACTION * vertices

export function summarise(result: SweepResult): SweepSummary {
  const def = result.corners.find((c) => c.corner.group === 'default')
  const items: ItemSummary[] = []
  const worstCases: WorstCase[] = []
  const failingOn = new Map<string, number>()
  for (const item of result.items) {
    let failing = 0
    let worst = {
      corner: 'default',
      visible: 0,
      fraction: 0,
      depth: 0,
      rawDepth: 0,
    }
    const vertices = item.vertices
    for (const c of result.corners) {
      const r = c.items[item.id]
      if (!r) continue
      const fraction = r.visible / Math.max(1, r.vertices)
      if (fails(r.visible, r.vertices)) {
        failing++
        failingOn.set(c.corner.id, (failingOn.get(c.corner.id) ?? 0) + 1)
      }
      if (fraction > worst.fraction)
        worst = {
          corner: c.corner.id,
          visible: r.visible,
          fraction,
          depth: r.visibleDepth,
          rawDepth: r.rawDepth,
        }
      if (r.visible > 0)
        worstCases.push({
          item: item.id,
          corner: c.corner.id,
          visible: r.visible,
          fraction,
          depth: r.visibleDepth,
        })
    }
    const d = def?.items[item.id]
    const atDefault = { visible: d?.visible ?? 0, depth: d?.visibleDepth ?? 0 }
    const verdict: Verdict =
      d && fails(d.visible, d.vertices)
        ? 'broken-at-default'
        : failing > 0
        ? 'fails-at-extremes'
        : 'holds'
    items.push({
      item,
      vertices,
      verdict,
      failing,
      bodies: result.corners.length,
      atDefault,
      worst,
    })
  }
  worstCases.sort((a, b) => b.fraction - a.fraction || b.depth - a.depth)
  // One row per item: its worst body.
  const firstPerItem = new Set<string>()
  const perItem = worstCases.filter((w) =>
    firstPerItem.has(w.item) ? false : (firstPerItem.add(w.item), true)
  )

  // Bone issues: per (kind, joint), how many bodies, and the worst.
  const bones = new Map<string, BoneSummary & { amount: number }>()
  for (const c of result.corners)
    for (const i of c.bones) {
      const key = `${i.kind}:${i.joint}`
      const b = bones.get(key)
      const amount = Math.abs(
        i.kind === 'scale' ? Math.log(i.amount) : i.amount
      )
      if (!b)
        bones.set(key, {
          kind: i.kind,
          joint: i.joint,
          bodies: 1,
          worst: { corner: c.corner.id, detail: i.detail },
          amount,
        })
      else {
        b.bodies++
        if (amount > b.amount) {
          b.amount = amount
          b.worst = { corner: c.corner.id, detail: i.detail }
        }
      }
    }

  const candidates: Record<string, string[]> = {}
  for (const s of items) {
    if (s.item.category !== 'clothes' || s.verdict !== 'holds') continue
    if (s.item.licence?.licence !== 'CC0-1.0') continue
    const slot = s.item.slot ?? 'outfit'
    ;(candidates[slot] ??= []).push(s.item.name)
  }
  const group = new Map(
    result.corners.map((c) => [c.corner.id, c.corner.group])
  )
  return {
    thresholds: {
      fraction: FAIL_FRACTION,
      minVertices: FAIL_MIN_VERTICES,
      toleranceMm: 1,
    },
    bodies: result.corners.length,
    items,
    worstCases: perItem.slice(0, 40),
    hardestBodies: [...failingOn]
      .map(([corner, failing]) => ({
        corner,
        group: group.get(corner) ?? '',
        failing,
      }))
      .sort((a, b) => b.failing - a.failing)
      .slice(0, 15),
    bones: [...bones.values()]
      .sort((a, b) => b.bodies - a.bodies || b.amount - a.amount)
      .map(({ amount: _a, ...b }) => b),
    boneBaseline: result.boneBaseline,
    candidates,
  }
}

// Depths are measured to 30 mm (the inside test's cap); deeper reads as 30+.
const mm = (m: number) => (m >= 0.0299 ? '30+' : (m * 1000).toFixed(1))
const pct = (f: number) => (f * 100).toFixed(2) + '%'

/** What a corner's id means, for people. */
export function describeCorner(id: string): string {
  if (id === 'default') return 'the default body'
  const names: Record<string, [string, string, string]> = {
    g: ['gender', 'female', 'male'],
    a: ['age', '', 'old (90)'],
    m: ['muscle', 'min', 'max'],
    w: ['weight', 'min', 'max'],
    h: ['height', 'short', 'tall'],
    p: ['proportions', 'uncommon', 'ideal'],
  }
  return id
    .split('-')
    .map((part) => {
      const m = /^([a-z]+)([\d.]+)$/.exec(part)
      if (!m) return part
      const [, k, v] = m as unknown as [string, string, string]
      const n = names[k]
      if (n && (v === '0' || v === '1'))
        return v === '0' ? n[1] || `${n[0]} 0` : n[2]
      return `${k} ${v}`
    })
    .join(', ')
}

export function renderMarkdown(
  meta: Record<string, unknown>,
  s: SweepSummary,
  result: SweepResult,
  sheet: { file: string; cases: Array<{ item: string; corner: string }> } | null
): string {
  const L: string[] = []
  const byVerdict = (v: Verdict) => s.items.filter((i) => i.verdict === v)
  const clothes = s.items.filter((i) => i.item.category === 'clothes')
  const hair = s.items.filter((i) => i.item.category !== 'clothes')
  const groups = new Map<string, number>()
  for (const c of result.corners)
    groups.set(c.corner.group, (groups.get(c.corner.group) ?? 0) + 1)

  L.push('# Slider extremes sweep')
  L.push('')
  L.push(
    `Generated by \`bun bin/extremes.ts${
      meta.quick ? ' --quick' : ''
    }\` on ${String(meta.date).slice(0, 10)}, ` +
      `in ${meta.minutes} min under bun ${meta.bun}. The numbers are in \`reviews/extremes/extremes.json\`. ` +
      `Pack: \`${meta.pack}\` (MakeHuman ${
        (meta.packSource as { commit?: string })?.commit?.slice(0, 10) ?? '?'
      }). ` +
      `Hair: ${meta.hair ? '`' + meta.hair + '`' : 'not swept'}. Licences: ${
        meta.licenceSource
      }.`
  )
  L.push('')
  L.push('## What was run')
  L.push('')
  L.push(
    `${s.bodies} bodies (${[...groups]
      .map(([g, n]) => `${n} ${g}`)
      .join(', ')}; the subset and why ` +
      'are in `src/extremes-corners.ts`), each wearing every item below alone: ' +
      `${clothes.length} MakeHuman garments and ${hair.length} hair, brow and beard pieces ` +
      '(MakeHuman proxies through proxy-fit, Quaternius styles through hair-fit), fitted as the character builder fits them.'
  )
  L.push('')
  L.push(
    `Every fitted vertex was put to a signed-distance inside test against the bare skin ` +
      `(nearest triangle through a grid, signed by the angle-weighted pseudo-normal, with a three-ray parity vote ` +
      `beyond 2 cm; the body mesh has ${result.boundaryEdges} open edges). A vertex is **visibly** inside ` +
      `when it is deeper than the character builder tucks the skin there (coverBody's 6 mm for listed skin, 4-10 mm under a wrapping garment), ` +
      `by more than ${s.thresholds.toleranceMm} mm. An item **fails** on a body when more than ` +
      `${pct(s.thresholds.fraction)} of its vertices, and more than ${
        s.thresholds.minVertices
      }, are visibly inside.`
  )
  L.push('')
  L.push(
    `Not covered: layering (two garments on one body), posed bodies (everything is at the rest pose, ` +
      `so a sleeve through a bent elbow is not seen), and Quaternius' brows. The tuck is reproduced without ` +
      `coverBody's fade at the edge of the covered patch, so it is a little generous at the edges. ` +
      `No skin is tucked under hair, so a hair vertex inside the skin counts wherever it is: a style modelled ` +
      `with an inner layer under the scalp scores worse than it looks. Depths are measured to 30 mm; deeper reads 30+.`
  )
  L.push('')

  L.push('## Results')
  L.push('')
  L.push(
    `- **Hold up** on every body: ${byVerdict('holds').length} of ${
      s.items.length
    } items ` +
      `(${
        byVerdict('holds').filter((i) => i.item.category === 'clothes').length
      } of ${clothes.length} garments).`
  )
  L.push(
    `- **Fail at the extremes** (fine on the default body): ${
      byVerdict('fails-at-extremes').length
    }.`
  )
  L.push(
    `- **Broken at the default body** already: ${
      byVerdict('broken-at-default').length
    }.`
  )
  const bodyIssues = s.bones.filter((b) => b.kind !== 'outside')
  L.push(
    `- **Bones:** ${
      s.bones.length === 0
        ? 'no issues on any body'
        : `${s.bones.length} joint issues (${bodyIssues.length} of length, symmetry or order)`
    }; ` +
      `${s.boneBaseline.length} joints sit outside the skin on the default body already (baseline, not flagged again).`
  )
  L.push('')

  L.push('## Starter-wardrobe candidates')
  L.push('')
  L.push(
    'CC0 garments that hold up on every swept body, by slot: the pool to choose the starter wardrobe from ' +
      '(the twelve are not chosen here). Each was worn alone; check pairs before shipping a look.'
  )
  L.push('')
  for (const [slot, names] of Object.entries(s.candidates).sort())
    L.push(
      `- **${slot}** (${names.length}): ${names
        .map((n) => '`' + n + '`')
        .join(', ')}`
    )
  if (Object.keys(s.candidates).length === 0) L.push('- none')
  L.push('')
  const near = clothes
    .filter(
      (i) =>
        i.verdict === 'fails-at-extremes' &&
        i.failing <= Math.max(1, s.bodies * 0.05)
    )
    .sort((a, b) => a.failing - b.failing)
  if (near.length > 0) {
    L.push(
      `Near misses (CC0 or not), failing on at most 5% of bodies, a likely fix away: ` +
        near
          .map(
            (i) =>
              `\`${i.item.name}\` (${i.failing}, worst ${describeCorner(
                i.worst.corner
              )})`
          )
          .join(', ') +
        '.'
    )
    L.push('')
  }

  const table = (rows: ItemSummary[]) => {
    L.push(
      '| Item | Slot | Licence | Verts | Verdict | Fails on | At default | Worst body | Worst visible | Deepest |'
    )
    L.push('| --- | --- | --- | ---: | --- | ---: | ---: | --- | ---: | ---: |')
    for (const i of rows)
      L.push(
        `| \`${i.item.name}\` | ${i.item.slot ?? i.item.category} | ${
          i.item.licence?.licence ?? 'unchecked'
        } | ${i.vertices} | ${i.verdict} | ` +
          `${i.failing}/${i.bodies} | ${i.atDefault.visible} | ${
            i.worst.corner
          } | ${i.worst.visible} (${pct(i.worst.fraction)}) | ${mm(
            i.worst.depth
          )} mm |`
      )
    L.push('')
  }
  const order = (a: ItemSummary, b: ItemSummary) =>
    a.failing - b.failing || a.worst.fraction - b.worst.fraction
  L.push('## Garments')
  L.push('')
  table([...clothes].sort(order))
  L.push('## Hair, brows and beards')
  L.push('')
  table([...hair].sort(order))

  L.push('## Worst cases')
  L.push('')
  if (sheet) {
    L.push(
      `![The worst cases, front and side](${sheet.file})\n\n` +
        'The contact sheet (drawn headless by `src/extremes-sheet.ts`): each case is the item on the body it ' +
        'fails worst on, at the rest pose, from the front and from the left; the body grey, the item blue, and red ' +
        'where the item is visibly inside the skin (drawn over everything, so it shows from behind too).'
    )
    L.push('')
    sheet.cases.forEach((c, i) =>
      L.push(
        `${i + 1}. \`${c.item}\` on ${c.corner} (${describeCorner(c.corner)})`
      )
    )
    L.push('')
  }
  L.push('| Item | Body | Visible | Of its vertices | Deepest beyond tuck |')
  L.push('| --- | --- | ---: | ---: | ---: |')
  for (const w of s.worstCases.slice(0, 25))
    L.push(
      `| \`${w.item}\` | ${w.corner} (${describeCorner(w.corner)}) | ${
        w.visible
      } | ${pct(w.fraction)} | ${mm(w.depth)} mm |`
    )
  L.push('')
  L.push('The bodies most items fail on:')
  L.push('')
  L.push('| Body | Group | Items failing |')
  L.push('| --- | --- | ---: |')
  for (const b of s.hardestBodies)
    L.push(
      `| ${b.corner} (${describeCorner(b.corner)}) | ${b.group} | ${
        b.failing
      } |`
    )
  L.push('')

  L.push('## Bone-length sanity')
  L.push('')
  L.push(
    "UAL's 65 joints fitted by `humanRig` to each body. Checked: finite positions; no bone under 1 mm; " +
      'no bone more than 2x longer or shorter than on the default body after scaling by height; left and right within 3%; ' +
      'the spine, legs and arms running downward in the rest pose; every joint inside the skin.'
  )
  L.push('')
  if (s.boneBaseline.length > 0)
    L.push(
      `Outside the skin on the default body (baseline): ${s.boneBaseline
        .map((j) => '`' + j + '`')
        .join(', ')}.`
    )
  L.push('')
  if (s.bones.length === 0) L.push('No issues on any body.')
  else {
    L.push('| Joint | Issue | Bodies | Worst body | Detail |')
    L.push('| --- | --- | ---: | --- | --- |')
    for (const b of s.bones.slice(0, 40))
      L.push(
        `| \`${b.joint}\` | ${b.kind} | ${b.bodies}/${s.bodies} | ${b.worst.corner} | ${b.worst.detail} |`
      )
    if (s.bones.length > 40)
      L.push(`\n…and ${s.bones.length - 40} more in the JSON.`)
  }
  L.push('')
  return L.join('\n')
}

export type { Corner }
