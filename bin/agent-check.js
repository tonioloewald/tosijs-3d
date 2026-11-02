/*
THE AGENT DONE-WHEN (#3699, WEBMCP-DESIGN.md step 6): with only the scene's
tools, read City Drive, make it night through the panel, and drive the car to
a named place. Run against the dev server in headless Chrome:

  bun run agent-check

(`bun bin/xr-emulate.ts /city-drive/ --flat --script bin/agent-check.js`).
Prints what each tool answered and throws if the car did not arrive.
*/
/* global __deep */
;(async () => {
  const lib = document.querySelector('tosi-doc-system').context['tosijs-3d']
  const b = __deep('tosi-b3d')
  b.agent = 'on'
  lib.enableSceneAgents({ expose: 'none', webmcp: false })
  const a = window.b3dAgent
  const call = (name, input) => a.call(`b3d_city_drive_${name}`, input)
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

  // The car loads after the page does.
  let scene = await call('scene')
  for (let i = 0; i < 120 && scene.you == null; i++) {
    await sleep(500)
    scene = await call('scene')
  }
  if (scene.you == null) throw new Error('agent-check: the car never loaded')

  const night = await call('panel_set', { control: 'time of day', value: 22 })
  const places = await call('places')
  const go = await call('control_go', { place: 'end of the street', wait: 60 })
  const after = await call('scene')
  const result = {
    tools: a.tools().map((t) => t.name),
    you: scene.you,
    night,
    places,
    go,
    timeOfDay: after.time?.timeOfDay,
  }
  if (go.state !== 'arrived')
    throw new Error(`agent-check: ${JSON.stringify(result, null, 1)}`)
  if (!(after.time?.timeOfDay >= 21.9))
    throw new Error(`agent-check: not night: ${JSON.stringify(result, null, 1)}`)
  return result
})()
