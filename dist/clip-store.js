/*#
# clip-store

The clips this browser keeps: motion of your own (a BVH capture, a Mixamo or
Meshy GLB's animations), kept by name as the files they came from, so any
character on the site can play them on its next visit. Captures are like
garments of your own, and this is their wardrobe beside `tosijs-garments`
(IndexedDB `tosijs-clips`).

A kept clip is its FILE's bytes with its kind (`bvh` or `glb`), so it is read
again exactly as it was read the first time ([bvh](/bvh/),
[glb-clips](/glb-clips/)), and a newer reader reads it better.
*/
/*{ "parent": "glb-clips", "order": 20 }*/
/** This browser's clip files (IndexedDB `tosijs-clips`). */
export function clipStore() {
    const run = async (mode, fn) => {
        const db = await new Promise((ok, no) => {
            const r = indexedDB.open('tosijs-clips', 1);
            r.onupgradeneeded = () => r.result.createObjectStore('clips');
            r.onsuccess = () => ok(r.result);
            r.onerror = () => no(r.error);
        });
        return new Promise((ok, no) => {
            const t = db.transaction('clips', mode);
            const req = fn(t.objectStore('clips'));
            t.oncomplete = () => ok(req?.result);
            t.onerror = () => no(t.error);
        });
    };
    return {
        put: (clip) => run('readwrite', (st) => st.put(clip, clip.name)),
        delete: (name) => run('readwrite', (st) => st.delete(name)),
        all: () => run('readonly', (st) => st.getAll()),
    };
}
/** What kind of clip file a name is, by its extension (null: neither). */
export function clipKind(fileName) {
    const ext = fileName.toLowerCase().split('.').pop();
    return ext === 'bvh' ? 'bvh' : ext === 'glb' || ext === 'gltf' ? 'glb' : null;
}
//# sourceMappingURL=clip-store.js.map