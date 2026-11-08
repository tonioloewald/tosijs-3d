# bar-menu

**A button on the system bar that is a menu.** Press it and a short list
opens under the bar; pick one and the list closes. It is the select you would
put in a panel, one press shorter, and the same flat and in a headset. The
camera mode of [inspect-view](/inspect-view/) uses one to pick its view:
`viewMenu(inspect)`.

```js
import { b3d, barMenu, b3dLight, b3dGround } from 'tosijs-3d'

const weather = barMenu({
  icon: 'sun',
  title: 'Weather',
  options: ['clear', 'cloudy', 'storm'],
  value: 'clear',
  handleChange: (v) => console.log(v),
})
preview.append(
  b3d(
    {},
    b3dLight({ intensity: 1 }),
    b3dGround({ width: 20, height: 20, texture: 'checker', textureTiles: 10 }),
    weather
  )
)
```
```css
tosi-b3d { width: 100%; height: 100%; }
```

It returns the `<tosi-b3d-panel>`: put it in the scene to show the button,
take it out to hide it. `menu.value` reads or sets the choice (the list marks
it).

## A menu of actions

An option can be an action, not a choice (`handleSelect`, with a tick when
`checked`), a submenu (`items`, opened in place of the list with a way back,
which is easier to reach in a headset than a list flying out beside it), a
rule (`separator: true`) or `disabled`. `options` may be a function, read each
time the menu opens, so a list of saved things is always current. The
character builder's **Character** menu is one:

```
barMenu({
  icon: 'character',
  title: 'Character',
  options: () => [
    { label: 'Select', items: () => saved.map((n) => ({ label: n, checked: n === current, handleSelect: () => load(n) })) },
    { label: 'Save', handleSelect: save },
    { separator: true },
    { label: 'Export JSON', handleSelect: exportJson },
  ],
})
```

`layout: 'list'` draws a row per option, its icon beside its caption; by
default a menu whose options all have icons is a toolbar of icons instead.
`viewMenu` uses the list, so "front" is not mistaken for "back".
