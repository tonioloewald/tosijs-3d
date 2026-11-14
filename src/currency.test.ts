import { describe, expect, test } from 'bun:test'
import { currencyFor, formatMoney } from './currency.js'

describe('currency', () => {
  test('suffixes: gold, gp, USD', () => {
    expect(formatMoney(12, 'gold')).toBe('12 gold')
    expect(formatMoney(12, { id: 'gold', label: 'gp' })).toBe('12 gp')
    expect(formatMoney(1250, { id: 'usd', label: 'USD' })).toBe('1250 USD')
  })

  test('prefixes: € and $, and the euro either way', () => {
    expect(formatMoney(12, { id: 'usd', label: '$', position: 'prefix' })).toBe('$12')
    expect(formatMoney(12.5, { id: 'eur', label: '€', position: 'prefix', decimals: 2 })).toBe('€12.50')
    expect(formatMoney(12, { id: 'eur', label: '€', position: 'suffix' })).toBe('12 €')
  })

  test('negative amounts and fractions', () => {
    expect(formatMoney(-3, { id: 'usd', label: '$', position: 'prefix' })).toBe('-$3')
    expect(formatMoney(2.345, 'gold')).toBe('2.35 gold')
  })

  test('a purse key with no currency is written after the amount', () => {
    expect(currencyFor([{ id: 'eur', label: '€', position: 'prefix' }], 'gold')).toEqual({ id: 'gold' })
    expect(currencyFor(undefined, 'gold')).toEqual({ id: 'gold' })
  })
})
