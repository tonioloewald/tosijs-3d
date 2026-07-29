import { describe, test, expect } from 'bun:test'
import { parseStyleSuffixes, mergeIconStyle, type IconStyle } from './icon-name'

describe('parseStyleSuffixes — transforms', () => {
  test('rotate', () => {
    expect(parseStyleSuffixes('chevron90r')).toEqual({
      baseName: 'chevron',
      style: { transform: 'rotate(90deg)', transformOrigin: '50% 50%' },
    })
  })

  test('negative rotate via _', () => {
    expect(parseStyleSuffixes('arrow_45r')).toEqual({
      baseName: 'arrow',
      style: { transform: 'rotate(-45deg)', transformOrigin: '50% 50%' },
    })
  })

  test('flip H (0f) and V (1f)', () => {
    expect(parseStyleSuffixes('chevron0f')?.style.transform).toBe('scaleX(-1)')
    expect(parseStyleSuffixes('chevron1f')?.style.transform).toBe('scaleY(-1)')
  })

  test('scale / translate', () => {
    expect(parseStyleSuffixes('star75s')?.style.transform).toBe('scale(0.75)')
    expect(parseStyleSuffixes('plus20x')?.style.transform).toBe(
      'translateX(20%)'
    )
    expect(parseStyleSuffixes('plus_10y')?.style.transform).toBe(
      'translateY(-10%)'
    )
  })

  test('chained transforms concatenate in order', () => {
    expect(parseStyleSuffixes('chevron90r75s')?.style.transform).toBe(
      'rotate(90deg) scale(0.75)'
    )
  })
})

describe('parseStyleSuffixes — non-transform styles', () => {
  test('opacity', () => {
    expect(parseStyleSuffixes('camera50o')?.style).toEqual({ opacity: '0.5' })
  })

  test('hex fill / stroke', () => {
    expect(parseStyleSuffixes('close_ff0000F')?.style.fill).toBe('#ff0000')
    expect(parseStyleSuffixes('close_f00S')?.style.stroke).toBe('#f00')
  })

  test('named color → CSS var', () => {
    expect(parseStyleSuffixes('chevron_accentS')?.style.stroke).toBe(
      'var(--accent)'
    )
  })

  test('stroke width', () => {
    expect(parseStyleSuffixes('chevron3W')?.style.strokeWidth).toBe('3')
  })
})

describe('parseStyleSuffixes — base-name handling', () => {
  test('no suffix → null', () => {
    expect(parseStyleSuffixes('chevron')).toBeNull()
    expect(parseStyleSuffixes('arrowUpRight')).toBeNull()
  })

  test('digit-ending base needs a _ separator (stripped from base)', () => {
    const parsed = parseStyleSuffixes('edit2_50o')
    expect(parsed?.baseName).toBe('edit2')
    expect(parsed?.style.opacity).toBe('0.5')
  })

  test('suffix-only string → null (nothing to modify)', () => {
    expect(parseStyleSuffixes('90r')).toBeNull()
  })
})

describe('mergeIconStyle', () => {
  test('transforms concatenate', () => {
    const into: IconStyle = { transform: 'rotate(90deg)' }
    mergeIconStyle(into, { transform: 'rotate(90deg)' })
    expect(into.transform).toBe('rotate(90deg) rotate(90deg)')
  })

  test('scalar props are first-writer-wins (outer suffix beats inner redirect)', () => {
    const into: IconStyle = { opacity: '0.5' }
    mergeIconStyle(into, { opacity: '0.9', fill: '#f00' })
    expect(into.opacity).toBe('0.5') // kept
    expect(into.fill).toBe('#f00') // filled in
  })
})
