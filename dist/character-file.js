/*#
# character-file

**A character as one JSON document**: everything the
[character builder](/character-builder/) sets (where the body comes from, its
shape, skin, eyes, face, hair, clothes and their materials, the clip, the
tailor's work in progress) and the garments of your own it wears, so a file
opened on another machine dresses the same figure. The builder keeps the
figure you are working on in this browser (IndexedDB) and saves named ones
there too; **export** and **import** move them as files.

```javascript
import { writeCharacter, readCharacter } from 'tosijs-3d'

const doc = writeCharacter({ name: 'Ada', settings, cloth, tailor, garments })
const json = JSON.stringify(doc)
// …later, anywhere…
const { character, warnings } = readCharacter(json, defaults)
```

THE DOCUMENT IS VERSIONED. `format` is `tosijs-character` and `version` the
layout it was written in; `readCharacter` migrates an older one forward and
refuses one newer than it knows, rather than guess.

IT IS READ AGAINST THE PAGE'S DEFAULTS, so a document can never put the page
in a state it cannot draw: a setting the page does not have is dropped, one
of the wrong type is dropped, one that is missing keeps its default, and each
is listed in `warnings` (a document from a newer page, or a hand edit, then
loads as far as it can and says what it skipped).

GARMENTS TRAVEL INSIDE IT. A garment saved from the tailor lives in the
browser that saved it; the document carries each one the character wears as
its GLB (base64), so the figure is whole wherever it is opened.

SO DOES ITS BODY, when it is a mesh. `bodies` says where the body on show
comes from: a URL (and the object picked in it) when it has one, or the file
itself (base64, with its name) when it was opened from disk. A page that
does not have that body makes it from there.
*/
/*{ "parent": "character-builder", "order": 20 }*/
export const CHARACTER_FORMAT = 'tosijs-character';
/** The layout this module writes. */
export const CHARACTER_VERSION = 1;
/** A character as a document, ready for `JSON.stringify`. */
export function writeCharacter(c, options = {}) {
    return {
        format: CHARACTER_FORMAT,
        version: CHARACTER_VERSION,
        name: c.name,
        ...(options.saved != null ? { saved: options.saved } : {}),
        settings: { ...c.settings },
        cloth: Object.fromEntries(Object.entries(c.cloth).map(([k, v]) => [
            k,
            { look: v.look, material: v.material },
        ])),
        tailor: c.tailor.map((shape) => shape.map((p) => [p[0], p[1]])),
        garments: Object.fromEntries(Object.entries(c.garments).map(([k, v]) => [k, toBase64(v)])),
        ...(c.bodies && Object.keys(c.bodies).length
            ? {
                bodies: Object.fromEntries(Object.entries(c.bodies).map(([k, b]) => [
                    k,
                    {
                        ...(b.url != null ? { url: b.url } : {}),
                        ...(b.pick != null ? { pick: b.pick } : {}),
                        ...(b.file
                            ? { file: b.file.name, data: toBase64(b.file.bytes) }
                            : {}),
                    },
                ])),
            }
            : {}),
    };
}
/**
 * Read a document (parsed, or its JSON text) against the page's defaults:
 * `settings` (every key the page has, with its default value) and `slots`
 * (the clothing slots, with their default look). Throws when it is not a
 * character document, or is newer than this module.
 */
export function readCharacter(input, defaults) {
    const raw = typeof input === 'string' ? JSON.parse(input) : input;
    if (raw == null ||
        typeof raw !== 'object' ||
        raw.format !== CHARACTER_FORMAT)
        throw new Error('character-file: not a character document');
    const doc = migrate(raw);
    const warnings = [];
    const settings = {};
    const given = isObject(doc.settings) ? doc.settings : {};
    for (const [key, fallback] of Object.entries(defaults.settings)) {
        if (!(key in given)) {
            settings[key] = fallback;
            continue;
        }
        const v = given[key];
        if (sameKind(v, fallback))
            settings[key] = v;
        else {
            settings[key] = fallback;
            warnings.push(`${key}: expected ${kind(fallback)}, got ${kind(v)}; kept the default`);
        }
    }
    for (const key of Object.keys(given))
        if (!(key in defaults.settings))
            warnings.push(`${key}: not a setting here; skipped`);
    const cloth = {};
    const looks = isObject(doc.cloth) ? doc.cloth : {};
    for (const [slot, fallback] of Object.entries(defaults.slots ?? {})) {
        const v = looks[slot];
        cloth[slot] =
            isObject(v) && typeof v.look === 'string' && isObject(v.material)
                ? { look: v.look, material: v.material }
                : fallback;
    }
    const tailor = Array.isArray(doc.tailor)
        ? doc.tailor
            .filter(Array.isArray)
            .map((shape) => shape
            .filter((p) => Array.isArray(p) &&
            Number.isFinite(p[0]) &&
            Number.isFinite(p[1]))
            .map((p) => [p[0], p[1]]))
        : [];
    const garments = {};
    for (const [name, b64] of Object.entries(isObject(doc.garments) ? doc.garments : {})) {
        try {
            if (typeof b64 !== 'string')
                throw new Error('not base64');
            garments[name] = fromBase64(b64);
        }
        catch {
            warnings.push(`garment ${name}: unreadable; skipped`);
        }
    }
    const bodies = {};
    for (const [name, b] of Object.entries(isObject(doc.bodies) ? doc.bodies : {})) {
        try {
            if (!isObject(b))
                throw new Error('not a body');
            const pick = typeof b.pick === 'string' ? { pick: b.pick } : {};
            if (typeof b.data === 'string')
                bodies[name] = {
                    ...pick,
                    file: {
                        name: typeof b.file === 'string' ? b.file : name,
                        bytes: fromBase64(b.data),
                    },
                };
            else if (typeof b.url === 'string')
                bodies[name] = { ...pick, url: b.url };
            else
                throw new Error('no url or data');
        }
        catch {
            warnings.push(`body ${name}: unreadable; skipped`);
        }
    }
    return {
        character: {
            name: typeof doc.name === 'string' ? doc.name : '',
            settings,
            cloth,
            tailor,
            garments,
            ...(Object.keys(bodies).length ? { bodies } : {}),
        },
        warnings,
    };
}
/** An older layout brought forward, one version at a time. */
function migrate(doc) {
    const version = Number(doc.version);
    if (!Number.isInteger(version) || version < 1)
        throw new Error(`character-file: no version (${doc.version})`);
    if (version > CHARACTER_VERSION)
        throw new Error(`character-file: version ${version} is newer than this page reads (${CHARACTER_VERSION})`);
    // Version 1 is the first: nothing to bring forward yet. A layout change
    // adds a step here (if (doc.version === 1) doc = { ...doc, …, version: 2 }).
    return doc;
}
const isObject = (v) => v != null && typeof v === 'object' && !Array.isArray(v);
const kind = (v) => v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v;
/** A value can stand in for the default when it is the same kind of thing. */
const sameKind = (v, fallback) => fallback == null
    ? true
    : kind(v) === kind(fallback) &&
        (typeof v !== 'number' || Number.isFinite(v));
// The builder writes the working figure after every change, and a body is
// megabytes: each byte array is encoded once.
const encoded = new WeakMap();
function toBase64(bytes) {
    const known = encoded.get(bytes);
    if (known != null)
        return known;
    const out = encode(bytes);
    encoded.set(bytes, out);
    return out;
}
function encode(bytes) {
    let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000)
        s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(s);
}
function fromBase64(b64) {
    const s = atob(b64);
    const out = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++)
        out[i] = s.charCodeAt(i);
    return out;
}
//# sourceMappingURL=character-file.js.map