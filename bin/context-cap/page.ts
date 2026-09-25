// The page `bin/context-cap.ts` drives — see that file for what it proves.
import { b3d } from '../../src/tosi-b3d.js'

const w = window as any
const kept: any[] = [] // removed scenes, retained the way an SPA or doc cache would
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

const mount = () => {
  const el: any = b3d({
    style: 'display:block;width:200px;height:150px',
    clearColor: '#ff0000',
  })
  document.body.append(el)
  return el
}

/** The centre pixel of a scene's canvas, or 'lost' if its context is gone. */
async function centrePixel(el: any) {
  await sleep(400)
  const c = el.shadowRoot?.querySelector('canvas') as HTMLCanvasElement
  const gl = (c.getContext('webgl2') ||
    c.getContext('webgl')) as WebGL2RenderingContext
  if (!gl || gl.isContextLost()) return 'lost'
  const px = new Uint8Array(4)
  gl.readPixels(100, 75, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px)
  return Array.from(px).join(',')
}

async function trips(n: number) {
  for (let i = 0; i < n; i++) {
    const el = mount()
    await sleep(220)
    el.remove()
    kept.push(el)
    await sleep(30)
  }
}

w.run = async () => {
  await trips(30)
  const survivor = mount()
  await sleep(300)
  // Push well past Chrome's per-page cap while the survivor is live.
  await trips(20)
  const survivorPx = await centrePixel(survivor)
  // Remove and RE-ADD the same element: teardown lost its canvas's context,
  // so this is the path that must swap in a fresh canvas.
  survivor.remove()
  await sleep(50)
  document.body.append(survivor)
  const readdPx = await centrePixel(survivor)
  return JSON.stringify({ survivorPx, readdPx })
}
w.ready = true
