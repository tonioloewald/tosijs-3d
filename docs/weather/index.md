# weather

**The one question every weather consumer asks: what is the weather here,
now?** `weatherAt(base, cells, x, z)` answers it from the scene's base weather
plus every weather CELL that reaches the point. A cell is a region that differs
(a lee behind a ridge, a storm), the climate layer of a province, and a
moving cell is a weather system. The design is in
[WEATHER-DESIGN.md](https://github.com/tonioloewald/tosijs-3d/blob/main/WEATHER-DESIGN.md).

Composition is per quantity, and a province's climate
([province-climate](/province-climate/)) uses the same rules for the
quantities they share:

| quantity | rule | why |
| --- | --- | --- |
| `wind` | vector SUM | a lee subtracts, a gust adds |
| `temperature` | signed SUM | opposing regions cancel |
| `coverage` | SUM, clamped 0–2 | a storm thickens the sky, a clear cell thins it; past 1 is THICKNESS (a storm tower), as on the deck's own dial |
| `precipitation` | MAX | two storms overlapping do not rain twice as hard |
| `storminess` | MAX | the worst one wins |

Pure and Babylon-free, so the simulation (and a driver) can ask the same
question the renderer does.
