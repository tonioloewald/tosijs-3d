# weather

**The one question every weather consumer asks: what is the weather here,
now?** `weatherAt(base, cells, x, z)` answers it from the scene's base weather
plus every weather CELL that reaches the point. A cell is a region that differs
(a lee behind a ridge, a storm), the climate layer of a province, and a
moving cell is a weather system. See WEATHER-DESIGN.md.

Composition is per quantity, the same rules as [[province-climate]], so two
ways of combining regions can never disagree at a boundary:

| quantity | rule | why |
| --- | --- | --- |
| `wind` | vector SUM | a lee subtracts, a gust adds |
| `temperature` | signed SUM | a cold cell beside a warm one cancels |
| `coverage` | SUM, clamped 0–2 | a storm thickens the sky, a clear cell thins it; past 1 is THICKNESS (a storm tower), as on the deck's own dial |
| `precipitation` | MAX | two storms overlapping do not rain twice as hard |
| `storminess` | MAX | like volcanism: the worst one wins |

Pure and Babylon-free, so the simulation (and a driver) can ask the same
question the renderer does.
