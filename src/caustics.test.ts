import { describe, expect, test, beforeAll } from 'bun:test'

let causticPattern: typeof import('./caustics.js').causticPattern

beforeAll(async () => {
  const { Window } = await import('happy-dom')
  const win = new Window() as any
  const g = globalThis as any
  g.window ??= win
  for (const k of Object.getOwnPropertyNames(win)) {
    try {
      g[k] ??= win[k]
    } catch {
      /* off-document getters */
    }
  }
  causticPattern = (await import('./caustics.js')).causticPattern
})

describe('causticPattern (board #198)', () => {
  const N = 64
  test('deterministic: same seed, same web', () => {
    expect(causticPattern(N, 5, 3)).toEqual(causticPattern(N, 5, 3))
    expect(causticPattern(N, 5, 3)).not.toEqual(causticPattern(N, 5, 4))
  })

  test('TILES: each edge continues into the opposite one', () => {
    const p = causticPattern(N, 5, 3)
    const at = (x: number, y: number) => p[((y + N) % N) * N + ((x + N) % N)]
    // Adjacent across the wrap differ no more than adjacent inside the tile.
    let seam = 0
    let inner = 0
    for (let i = 0; i < N; i++) {
      seam +=
        Math.abs(at(0, i) - at(N - 1, i)) + Math.abs(at(i, 0) - at(i, N - 1))
      inner +=
        Math.abs(at(N / 2, i) - at(N / 2 - 1, i)) +
        Math.abs(at(i, N / 2) - at(i, N / 2 - 1))
    }
    expect(seam).toBeLessThan(inner * 1.5)
  })

  test('a web, not a wash: mostly dark, with a bright network', () => {
    const p = causticPattern(N, 5, 3)
    const bright = [...p].filter((v) => v > 128).length / p.length
    expect(bright).toBeGreaterThan(0.03)
    expect(bright).toBeLessThan(0.35)
  })
})
