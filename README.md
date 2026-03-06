# tosijs-3d

[github](https://github.com/tonioloewald/xinjs-3d/) | [live demo](https://tonioloewald.github.io/xinjs-3d/) | [npm](https://www.npmjs.com/package/tosijs-3d)

Declarative 3D/XR framework built on Babylon.js and tosijs. Compose 3D scenes with web components.
See the [b3d](?tosi-b3d.ts) page for a live interactive demo.

```javascript
import {
  b3d,
  b3dSun,
  b3dSkybox,
  b3dLoader,
  b3dWater,
  b3dReflections,
} from 'tosijs-3d'

document.body.append(
  b3d(
    { glowLayerIntensity: 1 },
    b3dSun({ shadowCascading: true }),
    b3dSkybox({ timeOfDay: 6, realtimeScale: 100 }),
    b3dLoader({ url: './scene.glb' }),
    b3dWater({ y: -0.2 }),
    b3dReflections()
  )
)
```

## Development

Requires [Bun](https://bun.sh).

```bash
bun install
bun start
```

Dev server runs on https://localhost:8030 with auto-rebuild on file changes.

<!--{ "pin": "top" }-->
