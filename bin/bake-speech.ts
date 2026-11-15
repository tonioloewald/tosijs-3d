#!/usr/bin/env bun
/*
 * bake-speech — render voice-acted dialogue lines to cached audio assets.
 *
 * The "voice acting bake": a manifest of { voice, text, direction } lines is rendered once via
 * Resemble (Chatterbox honours the inline `<speak prompt="…">` acting direction), written as mp3
 * into the static-assets speech pack, and CONTENT-CACHED so a re-run only synthesises what changed
 * — the point being not to burn TTS credits re-rendering lines that are already baked.
 *
 *   RESEMBLE_API_KEY=… bun bin/bake-speech.ts <manifest.json> [--out <dir>]
 *
 * Output defaults to the sibling asset repo's speech pack (../static-assets/assets/speech), which
 * publishes to cdn.tosijs.net/speech and is consumed in-scene via assetUrl('speech/<id>.mp3').
 * The API key comes from the environment ONLY — never a committed file.
 *
 * Manifest shape:
 *   {
 *     "model": "ultra",                            // optional; omitted = Resemble's default ("chatterbox" was retired)
 *     "voices": { "grant": "7c4296be", … },        // logical name → Resemble voice_uuid
 *     "lines": [
 *       { "id": "witness-weary", "voice": "grant",
 *         "text": "I already told the constable everything I know.",
 *         "direction": "weary and wary, keeping a stranger at arm's length" }
 *     ]
 *   }
 */
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, dirname } from 'node:path'

const ENDPOINT = 'https://f.cluster.resemble.ai/synthesize'
const PROJECT = '94a975ac' // Resemble "Default" project

type Line = {
  id: string
  voice: string
  text: string
  direction?: string
}
type Manifest = {
  model?: string
  voices: Record<string, string>
  lines: Line[]
}

function fail(msg: string): never {
  console.error(`bake-speech: ${msg}`)
  process.exit(1)
}

const args = process.argv.slice(2)
const manifestPath = args.find((a) => !a.startsWith('--'))
const outArg = args[args.indexOf('--out') + 1]
const outDir =
  args.includes('--out') && outArg
    ? outArg
    : join(dirname(import.meta.dir), '..', 'static-assets', 'assets', 'speech')

if (!manifestPath)
  fail('usage: bun bin/bake-speech.ts <manifest.json> [--out <dir>]')
const key = process.env.RESEMBLE_API_KEY
if (!key)
  fail(
    'RESEMBLE_API_KEY is not set (pass it via the environment, never a committed file)'
  )

const manifest: Manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
const model = manifest.model

await mkdir(outDir, { recursive: true })
const cachePath = join(outDir, '.bake-cache.json')
const cache: Record<string, string> = existsSync(cachePath)
  ? JSON.parse(await readFile(cachePath, 'utf8'))
  : {}

// The content key: identical (text, voice, direction, model) → identical audio, so a stable hash
// is both the cache key and proof a line is unchanged. Change any of them and it re-renders.
const contentKey = (voiceUuid: string, l: Line) =>
  createHash('sha256')
    /*
    NUL as the field separator, written as an ESCAPE.

    It cannot occur in any of the joined fields, so the hash cannot collide
    across a boundary. Written as a raw byte it made this file binary to git,
    which hides every future change to it from `git diff` and from grep --
    see `source-hygiene.test.ts` for what that cost once already.
    */
    .update(`${l.text}\0${voiceUuid}\0${l.direction ?? ''}\0${model ?? ''}`)
    .digest('hex')
    .slice(0, 16)

const index: Record<string, unknown> = {}
let baked = 0
let cached = 0
let failed = 0

for (const line of manifest.lines) {
  const voiceUuid = manifest.voices[line.voice]
  if (!voiceUuid) {
    console.error(`  ✗ ${line.id}: unknown voice "${line.voice}"`)
    failed++
    continue
  }
  const k = contentKey(voiceUuid, line)
  const file = `${line.id}.mp3`
  const dest = join(outDir, file)
  index[line.id] = {
    file: `speech/${file}`,
    voice: line.voice,
    text: line.text,
    direction: line.direction ?? null,
  }

  if (cache[line.id] === k && existsSync(dest)) {
    cached++
    continue // unchanged and already on disk — don't spend a credit
  }

  // `<speak prompt="…">` is how Chatterbox takes an acting direction; plain text otherwise.
  const data = line.direction
    ? `<speak prompt="${line.direction.replace(/"/g, '&quot;')}">${
        line.text
      }</speak>`
    : line.text
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      voice_uuid: voiceUuid,
      data,
      ...(model ? { model } : {}),
      output_format: 'mp3',
      sample_rate: 44100,
      project_uuid: PROJECT,
      title: line.id,
    }),
  })
  const body = (await res.json()) as {
    audio_content?: string
    error_name?: string
    message?: string
  }
  if (!body.audio_content) {
    console.error(
      `  ✗ ${line.id}: ${body.error_name ?? res.status} — ${
        body.message ?? 'no audio'
      }`
    )
    failed++
    continue
  }
  await writeFile(dest, Buffer.from(body.audio_content, 'base64'))
  cache[line.id] = k
  baked++
  console.log(`  ✓ ${line.id}  (${line.voice})`)
}

await writeFile(cachePath, JSON.stringify(cache, null, 2))
await writeFile(join(outDir, 'index.json'), JSON.stringify(index, null, 2))

console.log(
  `\nbake-speech: ${baked} rendered, ${cached} cached, ${failed} failed → ${outDir}`
)
console.log(`  play in-scene with assetUrl('speech/<id>.mp3')`)
if (failed > 0) process.exit(1)
