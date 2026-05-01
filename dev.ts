import * as path from 'path'
import { statSync, cpSync, mkdirSync } from 'fs'
import { watch } from 'chokidar'
import { $ } from 'bun'
import { extractDocs } from './bin/docs'

const PORT = 8030
const PROJECT_ROOT = import.meta.dir
const DIST_DIR = path.resolve(PROJECT_ROOT, 'dist')
const DOCS_DIR = path.resolve(PROJECT_ROOT, 'docs')

async function killStrayServer() {
  try {
    await $`lsof -ti:${PORT} | xargs kill -9 2>/dev/null`.quiet()
  } catch {
    // No process on port, that's fine
  }
}

function buildDocs() {
  extractDocs({
    paths: ['src', 'bin', 'README.md'],
    output: 'demo/docs.json',
  })
}

async function runTests() {
  try {
    await $`bun test`
  } catch {
    console.error('Tests failed!')
  }
}

async function build() {
  console.time('build')

  // Run tests
  await runTests()

  // Extract docs from source comments
  buildDocs()

  // Build library
  await $`rm -rf ${DIST_DIR}`.quiet()
  const result = await Bun.build({
    entrypoints: ['./src/index.ts'],
    outdir: './dist',
    sourcemap: 'linked',
    minify: true,
    external: ['jolt-physics'],
  })
  if (!result.success) {
    console.error('Library build failed')
    for (const message of result.logs) {
      console.error(message)
    }
    return
  }

  // Build doc browser into docs/
  mkdirSync(DOCS_DIR, { recursive: true })
  cpSync('./demo/static', DOCS_DIR, { recursive: true })
  cpSync('./static', DOCS_DIR, { recursive: true })
  cpSync(
    './node_modules/jolt-physics/dist/jolt-physics.wasm-compat.js',
    `${DOCS_DIR}/jolt-physics.wasm-compat.js`
  )
  const demoResult = await Bun.build({
    entrypoints: ['./demo/src/index.ts'],
    outdir: DOCS_DIR,
    sourcemap: 'linked',
    minify: true,
    external: ['jolt-physics'],
  })
  if (!demoResult.success) {
    console.error('Doc browser build failed')
    for (const message of demoResult.logs) {
      console.error(message)
    }
  }

  console.timeEnd('build')
}

watch('./src').on('change', build)
watch('./demo/src').on('change', build)

await killStrayServer()
await build()

function serveFromDir(config: {
  directory: string
  path: string
}): Response | null {
  const basePath = path.join(config.directory, config.path)
  const suffixes = ['', '.html', 'index.html']

  for (const suffix of suffixes) {
    try {
      const pathWithSuffix = path.join(basePath, suffix)
      const stat = statSync(pathWithSuffix)
      if (stat && stat.isFile()) {
        return new Response(Bun.file(pathWithSuffix))
      }
    } catch (err) {}
  }

  return null
}

const server = Bun.serve({
  port: PORT,
  tls: {
    key: Bun.file('./tls/key.pem'),
    cert: Bun.file('./tls/certificate.pem'),
  },
  fetch(request) {
    let reqPath = new URL(request.url).pathname
    console.log(request.method, reqPath)
    if (reqPath === '/') reqPath = '/index.html'
    // Strip /docs prefix since DOCS_DIR already points to docs/
    if (reqPath.startsWith('/docs/')) reqPath = reqPath.slice(5)

    // Serve from docs/ (the built site)
    const response = serveFromDir({
      directory: DOCS_DIR,
      path: reqPath,
    })
    if (response) return response

    // SPA fallback
    if (reqPath !== '/favicon.ico') {
      const spaResponse = serveFromDir({
        directory: DOCS_DIR,
        path: '/index.html',
      })
      if (spaResponse) return spaResponse
    }

    console.log(reqPath, 'not found')
    return new Response('File not found', {
      status: 404,
    })
  },
})

console.log(`Listening on https://localhost:${server.port}`)
