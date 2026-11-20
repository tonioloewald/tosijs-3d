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
export const CHECKLIST_ENDPOINT = '/__checklist';
let endpoint = CHECKLIST_ENDPOINT;
/** Where the scene asks: where your server mounted `checklistHandler`. */
export function setChecklistEndpoint(path) {
    endpoint = path.replace(/\/+$/, '') || CHECKLIST_ENDPOINT;
}
/** Was the page served by a dev server with a checklist endpoint? */
export const hasChecklistEndpoint = () => typeof window !== 'undefined' &&
    window.__tosiChecklist === true;
/** The posted list and its answers, or null (none, or not this page's to see). */
export async function fetchChecklist(fetcher = fetch) {
    try {
        const response = await fetcher(endpoint, { cache: 'no-store' });
        if (!response.ok)
            return null;
        const state = (await response.json());
        return state.list ? state : null;
    }
    catch {
        return null;
    }
}
async function gzip(text) {
    const stream = new Blob([text])
        .stream()
        .pipeThrough(new CompressionStream('gzip'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
}
// Browsers cap a keepalive body at 64 KB.
const KEEPALIVE_LIMIT = 60_000;
/** Send one answer, gzipped: an error message, or null when it saved. */
export async function sendChecklistAnswer(body, fetcher = fetch) {
    try {
        const zipped = await gzip(JSON.stringify(body));
        const response = await fetcher(`${endpoint}/answer`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Encoding': 'gzip',
            },
            body: zipped,
            // Outlives the page (a comment saved as the tab closes); a large
            // schematic goes as an ordinary request.
            keepalive: zipped.byteLength < KEEPALIVE_LIMIT,
        });
        if (response.ok)
            return null;
        return (await response.text().catch(() => '')) || `${response.status}`;
    }
    catch (e) {
        return e.message;
    }
}
//# sourceMappingURL=checklist-client.js.map