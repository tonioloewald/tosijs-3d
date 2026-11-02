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
