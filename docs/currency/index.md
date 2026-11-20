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
