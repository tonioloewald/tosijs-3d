import * as path from 'path'
import { statSync } from 'fs'
import { watch } from 'chokidar'
import { $ } from 'bun'

const PORT = 8030
const PROJECT_ROOT = import.meta.dir
const DIST_DIR = path.resolve(PROJECT_ROOT, 'dist')
const isSPA = true

async function killStrayServer() {
  try {
    await $`lsof -ti:${PORT} | xargs kill -9 2>/dev/null`.quiet()
  } catch {
    // No process on port, that's fine
  }
}

async function build() {
  console.time('build')
  let output = await $`rm -rf ${DIST_DIR}`.text()
  let result = await Bun.build({
    entrypoints: ['./src/index.ts'],
    outdir: './dist',
    sourcemap: 'linked',
    minify: true,
  })
  if (!result.success) {
    console.error('Build to /build failed')
    for (const message of result.logs) {
      console.error(message)
    }
    return
  }
  console.timeEnd('build')
}
watch('./src').on('change', build)

await killStrayServer()
await build()

function serveFromDir(config: {
  directory: string
  path: string
}): Response | null {
  let basePath = path.join(config.directory, config.path)
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

    // check public
    const publicResponse = serveFromDir({
      directory: PROJECT_ROOT,
      path: reqPath,
    })
    if (publicResponse) return publicResponse

    if (isSPA && reqPath !== '/favicon.ico') {
      const spaResponse = serveFromDir({
        directory: PROJECT_ROOT,
        path: '/index.html',
      })
      console.log(spaResponse)
      if (spaResponse) return spaResponse
    }
    console.log(reqPath, 'not found')
    return new Response('File not found', {
      status: 404,
    })
  },
})

console.log(`Listening on https://localhost:${server.port}`)
