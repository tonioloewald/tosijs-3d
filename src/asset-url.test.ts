import { afterEach, describe, expect, test } from 'bun:test'
import { assetUrl, setAssetBase, getAssetBase } from './asset-url'

afterEach(() => setAssetBase(''))

describe('assetUrl', () => {
  test('empty base → root-absolute local path', () => {
    expect(assetUrl('kenney/car.glb')).toBe('/kenney/car.glb')
    expect(assetUrl('/kenney/car.glb')).toBe('/kenney/car.glb')
  })

  test('base is applied and trailing slashes are trimmed', () => {
    setAssetBase('https://cdn.tosijs.net/')
    expect(getAssetBase()).toBe('https://cdn.tosijs.net')
    expect(assetUrl('kenney/car.glb')).toBe(
      'https://cdn.tosijs.net/kenney/car.glb'
    )
    expect(assetUrl('/kenney/car.glb')).toBe(
      'https://cdn.tosijs.net/kenney/car.glb'
    )
  })

  test('absolute / data / blob URLs pass through untouched', () => {
    setAssetBase('https://cdn.tosijs.net')
    expect(assetUrl('https://cdn.example/y.glb')).toBe('https://cdn.example/y.glb')
    expect(assetUrl('//cdn.example/y.glb')).toBe('//cdn.example/y.glb')
    expect(assetUrl('data:image/png;base64,AAA')).toBe(
      'data:image/png;base64,AAA'
    )
    expect(assetUrl('blob:abc-123')).toBe('blob:abc-123')
  })
})
