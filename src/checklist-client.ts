/*
# checklist-client

The page's side of the dev server's test checklist, for the scene's panel
(`b3d-checklist`): read the posted list, send an answer. The same protocol
as tosijs-ui's `doc-system/checklist-client` (the dev server's
`checklistHandler` at `/__checklist`), written out here so tosijs-3d ships no
import of tosijs-ui, which is only a dev dependency: an app without it
must still load the library.

`setChecklistEndpoint` here moves the scene's endpoint; an app with its own
server calls it (and tosijs-ui's, for the page's own panel) before the scene
connects.
*/

export interface ChecklistItemSpec {
  id?: string
  text: string
  url?: string
  steps?: string[]
}

export interface ChecklistSpec {
  id?: string
  title: string
  items?: (ChecklistItemSpec | string)[]
  sections?: { title?: string; items: (ChecklistItemSpec | string)[] }[]
}

export interface ChecklistItemAnswer {
  verdict: 'pass' | 'fail' | null
  comment: string
}

export interface ChecklistState {
  list: (ChecklistSpec & { id: string }) | null
  answers: Record<string, ChecklistItemAnswer>
  total: number
  pass: number
  fail: number
  open: number
}

export interface ChecklistAnswerBody {
  listId: string
  itemId: string
  verdict: 'pass' | 'fail' | null
  comment: string
  page?: string
  schematic?: string
}

export const CHECKLIST_ENDPOINT = '/__checklist'
let endpoint = CHECKLIST_ENDPOINT

/** Where the scene asks: where your server mounted `checklistHandler`. */
export function setChecklistEndpoint(path: string): void {
  endpoint = path.replace(/\/+$/, '') || CHECKLIST_ENDPOINT
}

/** Was the page served by a dev server with a checklist endpoint? */
export const hasChecklistEndpoint = (): boolean =>
  typeof window !== 'undefined' &&
  (window as { __tosiChecklist?: boolean }).__tosiChecklist === true

/** The posted list and its answers, or null (none, or not this page's to see). */
export async function fetchChecklist(
  fetcher: typeof fetch = fetch
): Promise<ChecklistState | null> {
  try {
    const response = await fetcher(endpoint, { cache: 'no-store' })
    if (!response.ok) return null
    const state = (await response.json()) as ChecklistState
    return state.list ? state : null
  } catch {
    return null
  }
}

async function gzip(text: string): Promise<Uint8Array> {
  const stream = new Blob([text])
    .stream()
    .pipeThrough(new CompressionStream('gzip'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

// Browsers cap a keepalive body at 64 KB.
const KEEPALIVE_LIMIT = 60_000

/** Send one answer, gzipped: an error message, or null when it saved. */
export async function sendChecklistAnswer(
  body: ChecklistAnswerBody,
  fetcher: typeof fetch = fetch
): Promise<string | null> {
  try {
    const zipped = await gzip(JSON.stringify(body))
    const response = await fetcher(`${endpoint}/answer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Encoding': 'gzip',
      },
      body: zipped as BodyInit,
      // Outlives the page (a comment saved as the tab closes); a large
      // schematic goes as an ordinary request.
      keepalive: zipped.byteLength < KEEPALIVE_LIMIT,
    })
    if (response.ok) return null
    return (await response.text().catch(() => '')) || `${response.status}`
  } catch (e) {
    return (e as Error).message
  }
}
