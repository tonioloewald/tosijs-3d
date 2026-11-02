/*#
# glb-chunks

**A GLB's two chunks, read and written, and its accessors read back.** The
GLB container module new readers and writers use (`skinned-glb`, and
Dramatis's VRM writer, hair reader and gates), so a check reads exports with
the reader the shipped code uses. Pure: no DOM, no engine, synchronous.
`tosijs-3d/glb-chunks`.

Reading, `readGlb`:

- under 12 bytes, a bad magic or a version other than 2 throws "not a GLB";
- a file shorter than its header's length, or a chunk running past it, throws
  "truncated GLB" (a short read, not a corrupt file);
- the first JSON chunk wins, and so does the first BIN chunk;
- the binary chunk is optional (`bin: null`); no JSON chunk throws.

Writing, `writeGlb`: the JSON padded with spaces and the binary chunk with
zeros, to 4 bytes; a null or empty binary chunk is left out, as the spec
allows a GLB with no buffer.

Accessors, `accessorBytes` / `accessorValues` / `readVec3`: tightly packed,
strided views de-interleaved, sparse accessors applied (one with no
`bufferView` starts from zeros, as glTF says), every read bounds-checked
against its buffer view.
*/
/*{ "parent": "character-core", "order": 31 }*/
/** 'glTF', little-endian: the first four bytes of every GLB. */
export const GLB_MAGIC = 0x46546c67;
const JSON_CHUNK = 0x4e4f534a; // 'JSON'
const BIN_CHUNK = 0x004e4942; // 'BIN\0'
const HEADER = 12;
/** Split a GLB into its JSON and binary chunk. Throws when it is not one. */
export function readGlb(bytes) {
    if (bytes.byteLength < HEADER)
        throw new Error(`not a GLB: ${bytes.byteLength} bytes, under the ${HEADER}-byte header`);
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (dv.getUint32(0, true) !== GLB_MAGIC)
        throw new Error('not a GLB (bad magic)');
    const version = dv.getUint32(4, true);
    if (version !== 2)
        throw new Error(`not a glTF 2.0 GLB (version ${version})`);
    const length = dv.getUint32(8, true);
    if (length < HEADER)
        throw new Error(`not a GLB: its header gives a length of ${length}`);
    if (length > bytes.byteLength)
        throw new Error(`truncated GLB: the header says ${length} bytes, there are ${bytes.byteLength}`);
    let offset = HEADER;
    let json;
    let bin = null;
    while (offset + 8 <= length) {
        const chunkLength = dv.getUint32(offset, true);
        const type = dv.getUint32(offset + 4, true);
        const start = offset + 8;
        if (start + chunkLength > length)
            throw new Error(`truncated GLB: the chunk at byte ${offset} runs ${start + chunkLength - length} bytes past the end`);
        const body = bytes.subarray(start, start + chunkLength);
        if (type === JSON_CHUNK && json === undefined)
            json = JSON.parse(new TextDecoder().decode(body));
        else if (type === BIN_CHUNK && bin === null)
            bin = body;
        offset = start + chunkLength;
    }
    if (json === undefined)
        throw new Error('the GLB has no JSON chunk');
    return { json, bin };
}
function padded(bytes, fill) {
    const n = (4 - (bytes.byteLength % 4)) % 4;
    if (n === 0)
        return bytes;
    const out = new Uint8Array(bytes.byteLength + n).fill(fill);
    out.set(bytes);
    return out;
}
/**
 * A GLB from JSON and a binary chunk, padded as the spec says. A null or
 * empty binary chunk is left out.
 */
export function writeGlb(json, bin) {
    const j = padded(new TextEncoder().encode(JSON.stringify(json)), 0x20);
    const b = bin === null || bin.byteLength === 0 ? null : padded(bin, 0);
    const total = HEADER + 8 + j.byteLength + (b === null ? 0 : 8 + b.byteLength);
    const out = new Uint8Array(total);
    const dv = new DataView(out.buffer);
    dv.setUint32(0, GLB_MAGIC, true);
    dv.setUint32(4, 2, true);
    dv.setUint32(8, total, true);
    dv.setUint32(12, j.byteLength, true);
    dv.setUint32(16, JSON_CHUNK, true);
    out.set(j, 20);
    if (b !== null) {
        const at = 20 + j.byteLength;
        dv.setUint32(at, b.byteLength, true);
        dv.setUint32(at + 4, BIN_CHUNK, true);
        out.set(b, at + 8);
    }
    return out;
}
/** Builds a binary chunk: each `add` is a new buffer view, 4-byte aligned. */
export class BinBuilder {
    parts = [];
    length = 0;
    views = [];
    /** Append bytes as a buffer view; returns its index. */
    add(bytes, target) {
        const view = {
            buffer: 0,
            byteOffset: this.length,
            byteLength: bytes.byteLength,
        };
        if (target !== undefined)
            view.target = target;
        this.views.push(view);
        const p = padded(bytes, 0);
        this.parts.push(p);
        this.length += p.byteLength;
        return this.views.length - 1;
    }
    /** The chunk so far. */
    bytes() {
        const out = new Uint8Array(this.length);
        let at = 0;
        for (const p of this.parts) {
            out.set(p, at);
            at += p.byteLength;
        }
        return out;
    }
}
const FLOAT = 5126;
const UNSIGNED_BYTE = 5121;
const UNSIGNED_SHORT = 5123;
const UNSIGNED_INT = 5125;
const COMPONENT_BYTES = {
    5120: 1,
    5121: 1,
    5122: 2,
    5123: 2,
    5125: 4,
    5126: 4,
};
const TYPE_COUNT = {
    SCALAR: 1,
    VEC2: 2,
    VEC3: 3,
    VEC4: 4,
    MAT4: 16,
};
/**
 * `count` elements of `size` bytes from a buffer view, starting `offset`
 * into it, tightly packed. Throws when the view or the read runs past what
 * is there.
 */
function viewElements(glb, viewIndex, offset, count, size, what) {
    const v = glb.json.bufferViews?.[viewIndex];
    if (v === undefined)
        throw new Error(`${what}: no bufferView ${viewIndex}`);
    if (glb.bin === null)
        throw new Error(`${what}: the GLB has no binary chunk`);
    const viewStart = v.byteOffset ?? 0;
    if (viewStart + v.byteLength > glb.bin.byteLength)
        throw new Error(`${what}: bufferView ${viewIndex} runs past the binary chunk`);
    const stride = v.byteStride ?? size;
    if (stride < size)
        throw new Error(`${what}: bufferView ${viewIndex}'s stride is under ${size}`);
    if (count > 0 && offset + (count - 1) * stride + size > v.byteLength)
        throw new Error(`${what}: runs past bufferView ${viewIndex}`);
    const base = viewStart + offset;
    if (stride === size)
        return glb.bin.subarray(base, base + count * size);
    const out = new Uint8Array(count * size);
    for (let e = 0; e < count; e++)
        out.set(glb.bin.subarray(base + e * stride, base + e * stride + size), e * size);
    return out;
}
/**
 * An accessor's bytes, tightly packed: a strided view de-interleaved, and a
 * sparse accessor's substitutions applied (over zeros when it has no
 * `bufferView`). May share memory with the binary chunk; copy before writing.
 */
export function accessorBytes(glb, index) {
    const what = `accessor ${index}`;
    const a = glb.json.accessors?.[index];
    if (a === undefined)
        throw new Error(`no accessor ${index}`);
    const component = COMPONENT_BYTES[a.componentType];
    const n = TYPE_COUNT[a.type];
    if (component === undefined || n === undefined)
        throw new Error(`${what}: unsupported ${a.componentType} ${a.type}`);
    const size = component * n;
    const s = a.sparse;
    const dense = a.bufferView === undefined
        ? null
        : viewElements(glb, a.bufferView, a.byteOffset ?? 0, a.count, size, what);
    if (s === undefined) {
        if (dense === null)
            return new Uint8Array(a.count * size);
        return dense;
    }
    const out = new Uint8Array(a.count * size);
    if (dense !== null)
        out.set(dense);
    const indexBytes = COMPONENT_BYTES[s.indices.componentType];
    if (s.indices.componentType !== UNSIGNED_BYTE &&
        s.indices.componentType !== UNSIGNED_SHORT &&
        s.indices.componentType !== UNSIGNED_INT)
        throw new Error(`${what}: bad sparse index type ${s.indices.componentType}`);
    const raw = viewElements(glb, s.indices.bufferView, s.indices.byteOffset ?? 0, s.count, indexBytes, `${what} sparse indices`);
    const values = viewElements(glb, s.values.bufferView, s.values.byteOffset ?? 0, s.count, size, `${what} sparse values`);
    const iv = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
    for (let k = 0; k < s.count; k++) {
        const at = indexBytes === 4
            ? iv.getUint32(k * 4, true)
            : indexBytes === 2
                ? iv.getUint16(k * 2, true)
                : iv.getUint8(k);
        if (at >= a.count)
            throw new Error(`${what}: sparse index ${at} past ${a.count}`);
        out.set(values.subarray(k * size, (k + 1) * size), at * size);
    }
    return out;
}
/** An accessor's components as numbers, element by element (not normalised). */
export function accessorValues(glb, index) {
    const a = glb.json.accessors[index];
    const bytes = accessorBytes(glb, index);
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const read = {
        5120: (o) => dv.getInt8(o),
        5121: (o) => dv.getUint8(o),
        5122: (o) => dv.getInt16(o, true),
        5123: (o) => dv.getUint16(o, true),
        5125: (o) => dv.getUint32(o, true),
        5126: (o) => dv.getFloat32(o, true),
    };
    const r = read[a.componentType];
    const step = COMPONENT_BYTES[a.componentType];
    const out = new Float64Array(bytes.byteLength / step);
    for (let k = 0; k < out.length; k++)
        out[k] = r(k * step);
    return out;
}
/** A float VEC3 accessor as xyz per element, sparse or not. */
export function readVec3(glb, index) {
    const a = glb.json.accessors?.[index];
    if (a === undefined)
        throw new Error(`no accessor ${index}`);
    if (a.componentType !== FLOAT || a.type !== 'VEC3')
        throw new Error(`accessor ${index} is not a float VEC3`);
    return new Float32Array(accessorBytes(glb, index).slice().buffer);
}
//# sourceMappingURL=glb-chunks.js.map