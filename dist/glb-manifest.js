/*#
# glb-manifest

**Reading the catalogue a curated library carries inside itself.** A GLB's JSON
chunk holds attribution (`asset.extras`) and, for libraries built by
`static-assets`, a per-item manifest at `scenes[0].extras.library` — name,
category, tags and bounding size for every model in the kit. Pure, dependency
free, unit tested.

## Read it off the LOADED NODES first — this is the fallback

**Babylon surfaces per-NODE extras and drops per-SCENE extras.** Its
`ExtrasAsMetadata` loader extension (registered by default when you import
`@babylonjs/loaders`) copies `extras` onto `metadata.gltf.extras` for nodes,
cameras, materials and animations — and scenes are not in that list. Verified
by loading a real library headlessly, not inferred:

    node "grass" → metadata.gltf.extras {category:"grass", tags:["grass"]}   ✅
    any node carrying scenes[0].extras.library                    → NONE      ❌

And the libraries already write per-item extras onto every item's own node, so
**`manifestFromNodes` is the route that works with no parsing at all** — the data
is sitting on the node you were going to query anyway. Use it.

This module's GLB parsing exists for the case that route cannot serve: reading a
library's contents WITHOUT loading it into a scene. It is also how `size` is
obtained until the builder writes it per node (today it lives only in the scene
index, where Babylon cannot reach it).

Recorded because the discovery went the wrong way round first: I found
`scenes[0].extras.library`, confirmed Babylon dropped it, and wrote a parser —
before checking the nodes, which had carried the same data all along. The
container format was the last place to look, not the first.

## Why the catalogue lives INSIDE the artifact

Deliberate, and a policy rather than a convenience. cdn.tosijs.net vends only
explicitly curated files: no sidecar manifests, no index, no directory listings.
Tonio: _"making all this cheaply discoverable would facilitate piracy and it's
not my content."_ Most of it is Kenney and Quaternius work, some of it paid — a
curated library is a use of the licence, a machine-readable catalogue of
everything is a mirror.

Metadata carried inside the GLB respects that line exactly: it helps whoever
already holds the artifact and publishes nothing to anyone who does not. That is
why this reads from the file and why there will never be a `.json` beside it.

## What a size is good for

`size` is the model's bounding box in metres, at library scale. It answers
"what fits here" without instantiating anything — the question placement code
actually asks, and the reason this beats measuring after the fact.
*/
/*{ "parent": "Utilities" }*/
const MAGIC = 0x46546c67; // 'glTF'
const JSON_CHUNK = 0x4e4f534a; // 'JSON'
/**
 * Pull the JSON chunk out of a GLB. Returns `null` for anything that is not one
 * — a `.gltf`, a truncated download, an HTML error page served with a 200.
 *
 * Never throws: a caller asking "does this file describe itself?" should get
 * "no", not an exception to guard.
 */
export function parseGlbJson(bytes) {
    const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    if (u8.byteLength < 20)
        return null;
    const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
    if (dv.getUint32(0, true) !== MAGIC)
        return null;
    const jsonLength = dv.getUint32(12, true);
    if (dv.getUint32(16, true) !== JSON_CHUNK)
        return null;
    // A ranged fetch may have stopped mid-chunk; that is a short read, not a
    // corrupt file, and the caller should be able to widen the range and retry.
    if (20 + jsonLength > u8.byteLength)
        return null;
    try {
        return JSON.parse(new TextDecoder().decode(u8.subarray(20, 20 + jsonLength)));
    }
    catch {
        return null;
    }
}
/**
 * How many bytes are needed to hold the whole JSON chunk, from a prefix that
 * covers at least the 20-byte header. `null` if it is not a GLB or the prefix
 * is too short to tell.
 *
 * Exists so a fetch can start small: read a few KB, learn the real length, and
 * widen only if it has to. A library's manifest can be tens of KB while the
 * file is a megabyte, and the whole point is not to download the megabyte.
 */
export function glbJsonByteLength(bytes) {
    const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    if (u8.byteLength < 20)
        return null;
    const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
    if (dv.getUint32(0, true) !== MAGIC)
        return null;
    return 20 + dv.getUint32(12, true);
}
/** Credit/licence/link a curated artifact carries, or `null`. */
export function glbAttribution(json) {
    const extras = json?.asset?.extras;
    if (extras == null || typeof extras !== 'object')
        return null;
    const { credit, license, link } = extras;
    if (credit == null && license == null && link == null)
        return null;
    return { credit, license, link };
}
/**
 * The library catalogue, or `null` for a GLB that is not one.
 *
 * Items are filtered to those that at least have a name, because a nameless
 * entry cannot be instantiated and its presence in a list is worse than its
 * absence — it looks like something you can ask for.
 */
export function libraryManifest(json) {
    const lib = json?.scenes?.[0]?.extras?.library;
    if (lib == null || !Array.isArray(lib.items))
        return null;
    const items = lib.items.filter((i) => i != null && typeof i.name === 'string' && i.name !== '');
    if (items.length === 0)
        return null;
    return {
        count: typeof lib.count === 'number' ? lib.count : items.length,
        categories: lib.categories,
        items,
    };
}
/**
 * Build a manifest from LOADED NODES — the primary path.
 *
 * Takes `{name, metadata}` pairs (Babylon nodes, structurally typed so this
 * stays Babylon-free and testable) and harvests `metadata.gltf.extras`. No
 * fetching, no parsing: `ExtrasAsMetadata` has already done the work by the
 * time the scene exists.
 */
export function manifestFromNodes(nodes) {
    const items = [];
    const categories = {};
    for (const n of nodes) {
        const extras = n?.metadata?.gltf?.extras;
        if (extras == null || typeof extras !== 'object')
            continue;
        if (typeof n.name !== 'string' || n.name === '')
            continue;
        const { category, tags, size } = extras;
        items.push({ name: n.name, category, tags, size });
        if (typeof category === 'string') {
            categories[category] = (categories[category] ?? 0) + 1;
        }
    }
    if (items.length === 0)
        return null;
    return { count: items.length, categories, items };
}
/** Names in a category, in manifest order. */
export function itemsInCategory(manifest, category) {
    return manifest.items
        .filter((i) => i.category === category)
        .map((i) => i.name);
}
/**
 * Items carrying ALL of `tags` — an and-query, because that is what narrowing
 * means and an or-query is just concatenating two searches.
 */
export function itemsWithTags(manifest, tags) {
    const want = tags.map((t) => t.toLowerCase());
    return manifest.items
        .filter((i) => {
        const have = (i.tags ?? []).map((t) => t.toLowerCase());
        return want.every((t) => have.includes(t));
    })
        .map((i) => i.name);
}
/**
 * Items that fit inside `[x, y, z]` metres.
 *
 * The question placement code actually asks — "what can I put in this gap" —
 * answered from the manifest rather than by instantiating candidates and
 * measuring them. An item with no recorded size is EXCLUDED rather than
 * assumed to fit: a prop that turns out to be a tree is a worse outcome than
 * one that never got offered.
 */
export function itemsFitting(manifest, [x, y, z]) {
    return manifest.items
        .filter((i) => {
        const s = i.size;
        if (s == null || s.length !== 3)
            return false;
        return s[0] <= x && s[1] <= y && s[2] <= z;
    })
        .map((i) => i.name);
}
//# sourceMappingURL=glb-manifest.js.map