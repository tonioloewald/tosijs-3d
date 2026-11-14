/*#
# currency

**How money is written.** A currency is the purse key it lives under
(`gold`), what it is called (`gold`, `gp`, `€`, `$`, `USD`) and which side
of the amount that goes: `€12` and `$12` put it first, `12 gold`, `12 gp`
and `12 USD` after. The euro is written both ways, so it is a choice, not a
rule.

```javascript
import { formatMoney } from 'tosijs-3d/currency'

formatMoney(12, { id: 'gold' }) // '12 gold'
formatMoney(12, { id: 'gold', label: 'gp' }) // '12 gp'
formatMoney(12.5, { id: 'eur', label: '€', position: 'prefix', decimals: 2 }) // '€12.50'
formatMoney(12, { id: 'eur', label: '€', position: 'suffix' }) // '12 €'
formatMoney(-3, { id: 'usd', label: '$', position: 'prefix' }) // '-$3'
```

Give an inventory its currencies (`createInventory(doc, { kinds, currencies })`)
and every view writes money with them: a panel's purse line, the value in an
item's info floater, a trade's `you pay …`. A purse key with no currency is
written as `12 <key>`.
*/
/*{ "parent": "inventory", "order": 14 }*/

export interface Currency {
  /** The purse key it lives under (`gold`). */
  id: string
  /** What it is called where it is written (default: `id`). */
  label?: string
  /** Before the amount (`€12`, `$12`) or after (`12 gold`, default). */
  position?: 'prefix' | 'suffix'
  /** A space between: default none before, one after. */
  space?: boolean
  /** Decimal places (default: as many as the amount has, up to 2). */
  decimals?: number
}

/** `amount` written in `currency` (or a bare purse key). */
export function formatMoney(amount: number, currency: Currency | string): string {
  const c = typeof currency === 'string' ? { id: currency } : currency
  const label = c.label ?? c.id
  const prefix = c.position === 'prefix'
  const space = c.space ?? !prefix
  const n = Math.abs(amount)
  const digits =
    c.decimals != null ? n.toFixed(c.decimals) : String(Math.round(n * 100) / 100)
  const sign = amount < 0 ? '-' : ''
  const gap = space ? ' ' : ''
  return prefix ? `${sign}${label}${gap}${digits}` : `${sign}${digits}${gap}${label}`
}

/** The currency for purse key `id` among `currencies`, else a plain one named after it. */
export function currencyFor(currencies: Currency[] | undefined, id: string): Currency {
  return currencies?.find((c) => c.id === id) ?? { id }
}
