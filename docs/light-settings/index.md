# Light settings (data)

**A lamp as DATA** — the type, its defaults, its JSON Schema, its canonical form
and its validator. No DOM, no Babylon, no widget.

Split out from [[light-editor]] for a reason worth stating, because it was
caught rather than foreseen: importing the editor pulls in `widgets3d`, which
pulls in tosijs, which needs `HTMLElement`. That put `validateLight` and
`lightSettingsSchema` behind a browser — and `tosijs-3d-ensemble` validates
documents in a headless runner with no DOM at all (their requirement 3, and the
same reason `evaluateCurve` is exported from the pure [[curve]] module).

A consumer that only wants to READ, VALIDATE or SERIALISE a lamp should never
have to instantiate a UI to do it. Same discipline as `world-store` versus
`world-view`, and `fly-by-wire` versus `b3d-aircraft`.
