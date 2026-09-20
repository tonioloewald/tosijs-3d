/*#
# b3d-galaxy

Procedural galaxy renderer using Babylon.js SolidParticleSystem. Generates
thousands of stars in a spiral arm distribution, each colored by spectral
class. All generation is seeded — same seed always produces the same galaxy.

Stars use a custom shader: white-hot center fading to spectral color at edges.
A procedural black hole with accretion disk sits at the galaxy center.

Stars are pickable — click one to zoom in and see its star system rendered
in detail. Use `getStarAt(index)` to retrieve star data and
`getStarSystem(index)` to get full planet detail for any star.
Use `hideStarAt(index)` to hide a star (e.g. when replacing it with a
rendered star system) and `showStarAt(index)` to restore it.

Filter stars by habitability index and/or name using `filterStars({ maxHI, nameSearch })` —
non-matching stars are dimmed.

## Demo

```js
import { b3d, b3dLight, b3dGalaxy, b3dStarSystem, label3d, slider3d, select3d } from 'tosijs-3d'
import { tosi, elements } from 'tosijs'
const { div, label, input, p, button, span } = elements

const { demo } = tosi({
  demo: {
    seed: 1234,
    starCount: 5000,
    radius: 100,
    spiralArms: 4,
    particleSize: 2.5,
    coreSize: 0.12,
    habitability: 5,
    nameSearch: '',
    selectedStar: '',
  },
})

const galaxy = b3dGalaxy({
  seed: demo.seed,
  starCount: demo.starCount,
  radius: demo.radius,
  spiralArms: demo.spiralArms,
  particleSize: demo.particleSize,
  coreSize: demo.coreSize,
})

// Star system state
let activeStarSystem = null
let activeStarIndex = -1
let sceneEl = null
// Transition: 'galaxy' | 'zooming-in' | 'star-system' | 'zooming-out'
let viewState = 'galaxy'
let transition = { t: 0, savedAlpha: 0, savedBeta: 0, savedRadius: 0, savedTarget: null }

function lerp(a, b, t) { return a + (b - a) * t }
function smoothstep(t) { return t * t * (3 - 2 * t) }

const scene = b3d(
  {
    frameRate: 60,
    // Generation settings live in the dual-presence ⚙ panel (works in VR); the
    // free-text star search + selection readout stay a flat overlay (typing needs
    // a keyboard). All widgets bind the same demo.* leaves the observers watch.
    scenePanel: () => [
      label3d({ text: 'Galaxy' }),
      select3d({ label: 'habitability', value: demo.habitability, options: [
        { label: 'All', value: 5 },
        { label: 'Robot+', value: 4 },
        { label: 'EVA+', value: 3 },
        { label: 'Survivable+', value: 2 },
        { label: 'Earthlike', value: 1 },
      ] }),
      // 50k, because the interesting use of this demo is now to stand INSIDE a
      // galaxy and photograph the sky from it — and a naked-eye sky wants tens
      // of thousands of stars, not five.
      slider3d({ label: 'stars', value: demo.starCount, min: 1000, max: 50000, step: 1000 }),
      slider3d({ label: 'radius', value: demo.radius, min: 50, max: 300, step: 10 }),
      slider3d({ label: 'spiral arms', value: demo.spiralArms, min: 1, max: 8, step: 1 }),
      // Down to 0.1: the old floor was 0.5, so the size you actually want for a
      // dense field was unreachable. Tonio: "I was testing 0.6 but couldn't
      // dial up 0.4."
      slider3d({ label: 'particle size', value: demo.particleSize, min: 0.1, max: 3, step: 0.1 }),
      // The core is scenery at galaxy scale and an obstruction from inside one.
      slider3d({ label: 'core size', value: demo.coreSize, min: 0, max: 4, step: 0.1 }),
      slider3d({ label: 'seed', value: demo.seed, min: 0, max: 65535, step: 1 }),
    ],
    sceneCreated(el, BABYLON) {
      sceneEl = el
      el.scene.clearColor = new BABYLON.Color4(0.012, 0.008, 0.024, 1)
      const camera = new BABYLON.ArcRotateCamera(
        'orbit-cam',
        -Math.PI / 2,
        Math.PI / 4,
        200,
        BABYLON.Vector3.Zero(),
        el.scene
      )
      camera.lowerRadiusLimit = 2
      camera.upperRadiusLimit = 500
      camera.minZ = 0.1
      camera.maxZ = 2000
      camera.attachControl(el.querySelector('canvas'), true)
      el.setActiveCamera(camera)

      // Transition animation
      el.scene.registerBeforeRender(() => {
        if (viewState === 'zooming-in') {
          transition.t = Math.min(1, transition.t + 0.02)
          const t = smoothstep(transition.t)
          // Fade galaxy out
          galaxy.setVisibility(1 - t)
          // Fade star system in
          if (activeStarSystem) activeStarSystem.setVisibility(t)
          // Zoom camera toward star, then reset to origin for star system view
          const starPos = transition.savedTarget
          camera.target.x = lerp(starPos.x, 0, t)
          camera.target.y = lerp(starPos.y, 0, t)
          camera.target.z = lerp(starPos.z, 0, t)
          camera.radius = lerp(transition.savedRadius, 100, t)
          if (transition.t >= 1) {
            viewState = 'star-system'
            galaxy.setVisibility(0)
            camera.target.set(0, 0, 0)
            camera.radius = 100
          }
        } else if (viewState === 'zooming-out') {
          transition.t = Math.min(1, transition.t + 0.02)
          const t = smoothstep(transition.t)
          // Fade star system out
          if (activeStarSystem) activeStarSystem.setVisibility(1 - t)
          // Fade galaxy in
          galaxy.setVisibility(t)
          camera.radius = lerp(100, transition.savedRadius, t)
          camera.target.x = lerp(0, transition.savedTarget.x, t)
          camera.target.y = lerp(0, transition.savedTarget.y, t)
          camera.target.z = lerp(0, transition.savedTarget.z, t)
          if (transition.t >= 1) {
            viewState = 'galaxy'
            if (activeStarSystem) {
              activeStarSystem.remove()
              activeStarSystem = null
            }
            galaxy.showStarAt(activeStarIndex)
            galaxy.setVisibility(1)
            activeStarIndex = -1
            demo.selectedStar.value = ''
            camera.alpha = transition.savedAlpha
            camera.beta = transition.savedBeta
            camera.radius = transition.savedRadius
            camera.target.set(transition.savedTarget.x, transition.savedTarget.y, transition.savedTarget.z)
          }
        }
      })

      // Star picking — click = mousedown + mouseup within 5px
      let downX = 0, downY = 0
      el.scene.onPointerDown = (evt) => {
        if (evt.button !== 0) return
        downX = evt.offsetX
        downY = evt.offsetY
      }
      el.scene.onPointerUp = (evt) => {
        if (evt.button !== 0 || viewState !== 'galaxy') return
        const dx = evt.offsetX - downX
        const dy = evt.offsetY - downY
        if (dx * dx + dy * dy > 25) return // dragged — not a click

        const sps = galaxy.getStarSPS()
        const starMesh = galaxy.getStarMesh()
        if (!sps || !starMesh) return

        // Use Babylon's built-in scene pick + SPS pickedParticle
        const pickResult = el.scene.pick(evt.offsetX, evt.offsetY)
        if (pickResult.hit && pickResult.pickedMesh === starMesh) {
          const picked = sps.pickedParticle(pickResult)
          if (picked) {
            zoomToStar(picked.idx, camera, el)
          }
        }
      }
    },
  },
  b3dLight({ intensity: 0.1 }),
  galaxy,
)

function zoomToStar(idx, camera, el) {
  if (activeStarSystem) {
    activeStarSystem.remove()
    galaxy.showStarAt(activeStarIndex)
  }

  activeStarIndex = idx
  const star = galaxy.getStarAt(idx)
  const pos = galaxy.getStarPosition(idx)
  if (!star || !pos) return

  demo.selectedStar.value = star.name + ' (' + star.spectralType + ', HI ' + star.bestHI + ')'
  galaxy.hideStarAt(idx)

  // Save camera state for return trip
  transition = {
    t: 0,
    savedAlpha: camera.alpha,
    savedBeta: camera.beta,
    savedRadius: camera.radius,
    savedTarget: { x: camera.target.x, y: camera.target.y, z: camera.target.z },
  }

  // Create star system at origin, full scale, initially invisible
  activeStarSystem = b3dStarSystem({
    galaxySeed: demo.seed.value,
    starCount: demo.starCount.value,
    starIndex: idx,
    scale: 5,
    orbitScale: 3,
    animate: true,
    showOrbits: true,
  })
  el.appendChild(activeStarSystem)
  activeStarSystem.setVisibility(0)

  viewState = 'zooming-in'
}

function returnToGalaxy() {
  if (viewState !== 'star-system') return
  transition.t = 0
  viewState = 'zooming-out'
}

// Escape key returns to galaxy view
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && activeStarIndex >= 0) returnToGalaxy()
})

const backBtn = button(
  {
    style: 'display:none; margin-top:4px; cursor:pointer; background:#444; color:white; border:1px solid #888; border-radius:3px; padding:2px 8px; font:12px monospace',
    onclick() { returnToGalaxy() },
  },
  'Back to galaxy'
)
const starLabel = span({ style: 'color:#8cf' })
demo.selectedStar.observe((v) => {
  starLabel.textContent = v
  backBtn.style.display = v ? 'block' : 'none'
})

// Flat overlay keeps only the star search + selection readout; the generation
// settings all live in the ⚙ scene panel (and in VR).
preview.append(
  scene,
  div(
    { class: 'debug-panel' },
    p('Click a star to zoom in. Esc to return. Generation settings in the scene panel (VR too).'),
    starLabel,
    backBtn,
    label(
      'search ',
      input({ type: 'text', placeholder: 'star name', style: 'width:8em; color:white; background:transparent; border:1px solid #666; padding:1px 4px; font:12px monospace', bindValue: demo.nameSearch }),
    ),
  )
)

for (const key of ['seed', 'starCount', 'radius', 'spiralArms', 'particleSize', 'coreSize']) {
  demo[key].observe(() => {
    if (activeStarSystem) {
      activeStarSystem.remove()
      activeStarSystem = null
      activeStarIndex = -1
      demo.selectedStar.value = ''
      viewState = 'galaxy'
    }
    galaxy.setVisibility(1)
    galaxy.regenerate()
  })
}

function applyFilter() {
  galaxy.filterStars({
    maxHI: Number(demo.habitability.value),
    nameSearch: demo.nameSearch.value,
  })
}
demo.habitability.observe(applyFilter)
demo.nameSearch.observe(applyFilter)
```
```css
tosi-b3d {
  width: 100%;
  height: 100%;
}
.debug-panel {
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(0,0,0,0.6);
  color: white;
  padding: 8px 12px;
  border-radius: 6px;
  font: 12px monospace;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
```

## Attributes

| Attribute | Default | Description |
| --- | --- | --- |
| `seed` | `1234` | Galaxy seed |
| `starCount` | `10000` | Number of stars |
| `radius` | `100` | Galaxy radius in scene units |
| `spiralArms` | `4` | Number of spiral arms |
| `spiralAngle` | `240` | Spiral arm sweep in degrees |
| `thickness` | `0.06` | Disk thickness (fraction of radius) |
| `particleSize` | `1.0` | Base star particle diameter |
| `coreSize` | `0.12` | Central black hole radius. Disk radii are multiples of it, so this scales the whole assembly |

*/
/*{ "parent": "Space" }*/

import { B3dChild } from './b3d-utils.js'
import * as BABYLON from '@babylonjs/core'
import type { B3d } from './tosi-b3d.js'
import {
  generateGalaxy,
  generateStarSystem,
  type StarData,
  type GalaxyData,
  type StarSystemData,
} from './galaxy-data.js'
import { b3dBlackHole } from './b3d-black-hole.js'

export class B3dGalaxy extends B3dChild {
  static preferredTagName = 'tosi-b3d-galaxy'

  static shadowStyleSpec = {
    ':host': {
      display: 'none',
    },
  }

  static initAttributes = {
    seed: 1234,
    starCount: 10000,
    radius: 100,
    spiralArms: 4,
    spiralAngle: 240,
    thickness: 0.06,
    particleSize: 1.0,
    /*
    SMALL, AND DIM. Measured rather than guessed: at `0.25` the whole assembly
    is 0.8 units across while a nebula is 2.25–7.5, so the hole was never
    geometrically large — it was SALIENT, a hard bright ring among soft faint
    gas, which reads as bigger than it is. Tonio: "the core black hole is simply
    way too big relative to anything else. It reads as the size of a nebula."

    So both levers: half the size again, and the disk and photon ring turned
    down. Brightness is the one that was actually doing the damage.
    */
    coreSize: 0.12,
  }

  declare seed: number
  declare starCount: number
  declare radius: number
  declare spiralArms: number
  declare spiralAngle: number
  declare thickness: number
  declare particleSize: number
  declare coreSize: number

  owner: B3d | null = null

  private rootNode: BABYLON.TransformNode | null = null
  private starSps: BABYLON.SolidParticleSystem | null = null
  private starMesh: BABYLON.Mesh | null = null
  private nebulaSps: BABYLON.SolidParticleSystem | null = null
  private nebulaMesh: BABYLON.Mesh | null = null
  private blackHoleEl: HTMLElement | null = null
  private galaxyData: GalaxyData | null = null
  private originalColors: BABYLON.Color4[] | null = null
  private registered = false
  private _beforeRender: (() => void) | null = null

  content = () => ''

  sceneReady(owner: B3d, scene: BABYLON.Scene) {
    this.owner = owner

    this.registerShaders()
    this.rootNode = new BABYLON.TransformNode('galaxy-root', scene)
    this.buildGalaxy()
    this.buildBlackHole()

    this._beforeRender = () => this.update()
    scene.registerBeforeRender(this._beforeRender)
  }

  sceneDispose() {
    if (this.owner && this._beforeRender) {
      this.owner.scene.unregisterBeforeRender(this._beforeRender)
    }
    this.disposeMeshes()
    if (this.blackHoleEl) {
      this.blackHoleEl.remove()
      this.blackHoleEl = null
    }
    this.rootNode?.dispose()
    this.rootNode = null
    this.owner = null
  }

  /**
   * Point every particle at THE CAMERA POSITION — a fixed world point, rather
   * than at the camera's view plane.
   *
   * ⚠️ THIS IS WHAT MAKES A CUBE BAKE WORK. `SolidParticleSystem.billboard`
   * aligns quads to the camera's VIEW PLANE, which is a different plane for
   * each of a cube's six faces — so every star and nebula silently re-orients
   * between captures, and the faces disagree at their seams.
   *
   * A cube map is ONE viewpoint photographed six ways. All six share a camera
   * POSITION and differ only in rotation, so that position is what the
   * particles should face: do it once, and every face sees each nebula from the
   * same angle and as the same shape.
   *
   * ⚠️ NOT the galactic centre. This was first written as `faceOrigin`, which
   * named the wrong thing even though the argument was right — Tonio: "No
   * faceorigin is wrong. Face the camera position." The observer is 55% of the
   * way out from the core, so facing the core would tilt every particle away
   * from the viewer by a different amount depending where it sits.
   *
   * Pass `null` to hand orientation back to the live camera.
   */
  facePoint(target: BABYLON.Vector3 | null): void {
    const systems = [this.starSps, this.nebulaSps]
    for (const sps of systems) {
      if (sps == null) continue
      if (target == null) {
        /*
        ⚠️ CLEAR THE QUATERNIONS. Billboarding does not replace them, it
        COMPOSES with them.

        Restoring `billboard = true` looked like enough and reported success —
        the flag really was back — while every particle silently kept the
        orientation `facePoint` had given it, so the live view came back as
        vertical smears. Tonio spotted it from the outside: "If you open the
        baker, screen cap, bake, and screen cap again you can see something
        weird is happening on restore."

        Which also means the two mechanisms were stacking during any pass where
        both were live, and that is worth knowing beyond this function.
        */
        sps.billboard = true
        sps.updateParticle = (p) => p
        for (const p of sps.particles) p.rotationQuaternion = null
        sps.setParticles()
        continue
      }
      sps.billboard = false
      /*
      TILT TOWARD THE POINT — do not pivot about the galactic plane.

      A FIXED world up (0,1,0) constrains the quad's own up to stay as close to
      +Y as it can, so the particle only ever yaws about the plane normal. Near
      the disc that looks fine and it is why the first version passed. Look down
      the Y axis, though, and the reference is parallel to the view direction:
      the rotation is degenerate, every particle goes edge-on, and the galaxy
      falls apart from exactly the angle you would most want to admire it from.
      Tonio: "I'd actually tilt the billboards to point at the camera, not pivot
      on the galactic plane. Then the galaxy would look good from above too."

      So the reference up SWAPS when the direction gets close to it. Any
      non-parallel vector will do — the roll of a radially symmetric blob does
      not matter — and swapping removes the singularity rather than moving it
      somewhere less likely.
      */
      const upY = new BABYLON.Vector3(0, 1, 0)
      const upZ = new BABYLON.Vector3(0, 0, 1)
      /*
      THE TARGET MUST BE IN THE PARTICLES' OWN SPACE.

      `particle.position` is SPS-LOCAL — relative to the system's mesh — while
      the camera position handed in is WORLD. They coincide only while the
      galaxy sits at the origin unrotated, which it usually does, so this was
      invisible and would have come back the moment anyone moved or tilted it.
      Converting once here costs nothing and removes the trap.
      */
      const mesh = sps.mesh
      const local = target.clone()
      if (mesh != null) {
        mesh.computeWorldMatrix(true)
        const inv = BABYLON.Matrix.Invert(mesh.getWorldMatrix())
        BABYLON.Vector3.TransformCoordinatesToRef(target, inv, local)
      }
      sps.updateParticle = (p) => {
        const dir = local.subtract(p.position)
        if (dir.lengthSquared() < 1e-8) return p
        dir.normalize()
        const ref = Math.abs(dir.y) > 0.98 ? upZ : upY
        /*
        BUILD THE BASIS BY HAND — `FromLookDirectionLH` does not do this.

        I assumed it aligned local +Z with the direction given. MEASURED, for a
        particle 1.7 units below the bake point, it put the quad's normal 30°
        off-axis: local +Z mapped to (-0.498, -0.359, 0.746) against a camera
        direction of (0.498, 0.718, -0.487) — a dot of -0.87, neither +1 nor -1,
        so not even a sign convention. A quad 30° off is an ELLIPSE, which is
        what Tonio kept seeing in the middle of the pole faces while I kept
        explaining it away as projection.

        Three cross products are unambiguous and cost nothing, and the result is
        verifiable with one dot product — which is how this was finally caught,
        and should have been the first thing tried.
        */
        const fwd = dir
        const right = BABYLON.Vector3.Cross(ref, fwd).normalize()
        const realUp = BABYLON.Vector3.Cross(fwd, right)
        p.rotationQuaternion = BABYLON.Quaternion.FromRotationMatrix(
          BABYLON.Matrix.FromValues(
            right.x, right.y, right.z, 0,
            realUp.x, realUp.y, realUp.z, 0,
            fwd.x, fwd.y, fwd.z, 0,
            0, 0, 0, 1
          )
        )
        return p
      }
      sps.setParticles()
    }
  }

  private update() {
    // Update particles every frame for billboard facing — unless something has
    // taken orientation over (see `facePoint`), in which case re-running this
    // would be harmless but pointless work.
    if (this.starSps?.billboard) this.starSps.setParticles()
    if (this.nebulaSps?.billboard) this.nebulaSps.setParticles()
  }

  private disposeMeshes() {
    if (this.starSps) {
      this.starSps.dispose()
      this.starSps = null
      this.starMesh = null
    }
    if (this.nebulaSps) {
      this.nebulaSps.dispose()
      this.nebulaSps = null
      this.nebulaMesh = null
    }
  }

  private registerShaders() {
    if (BABYLON.Effect.ShadersStore['galaxyStarVertexShader']) return

    BABYLON.Effect.ShadersStore['galaxyStarVertexShader'] = `
      precision highp float;
      attribute vec3 position;
      attribute vec2 uv;
      attribute vec4 color;
      uniform mat4 worldViewProjection;
      varying vec2 vUV;
      varying vec4 vColor;
      void main() {
        gl_Position = worldViewProjection * vec4(position, 1.0);
        vUV = uv;
        vColor = color;
      }
    `

    // Alpha channel encodes particle type:
    //   a > 0.9  → star
    //   a 0.5..0.9 → emission nebula (opacity = (a-0.5)*2.5)
    //   a < 0.5  → dark nebula (opacity = a*2)
    // Premultiplied alpha trick:
    //   rgb=color, a=0 → additive (stars, emission nebulae)
    //   rgb=0, a=opacity → darkening (dark nebulae)
    BABYLON.Effect.ShadersStore['galaxyStarFragmentShader'] = `
      precision highp float;
      varying vec2 vUV;
      varying vec4 vColor;

      // Hash-based pseudo-random for noise
      float hash(vec2 p) {
        vec3 p3 = fract(vec3(p.xyx) * 0.1031);
        p3 += dot(p3, p3.yzx + 33.33);
        return fract((p3.x + p3.y) * p3.z);
      }

      // Value noise with smooth interpolation
      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }

      // FBM — 4 octaves of noise for turbulent shapes
      float fbm(vec2 p) {
        float v = 0.0;
        float amp = 0.5;
        for (int i = 0; i < 4; i++) {
          v += amp * noise(p);
          p *= 2.0;
          amp *= 0.5;
        }
        return v;
      }

      void main() {
        vec2 uv = vUV - vec2(0.5);
        float d = length(uv) * 2.0;
        if (d > 1.0) discard;

        float a = vColor.a;

        if (a > 0.9) {
          // Star: additive glow, white center → spectral edge
          float core = 1.0 - smoothstep(0.0, 0.3, d);
          float glow = 1.0 - smoothstep(0.0, 1.0, d);
          vec3 starColor = vColor.rgb;
          vec3 col = mix(starColor, vec3(1.0), core) * (0.4 + glow * 0.6);
          float intensity = glow * glow;
          gl_FragColor = vec4(col * intensity, 0.0);
        } else if (a > 0.45) {
          // Emission nebula: turbulent additive glow
          float nebulaOpacity = (a - 0.5) * 2.5;
          // Use color as a per-particle seed for unique shapes
          vec2 seed = vec2(vColor.r * 73.0 + vColor.g * 157.0, vColor.b * 211.0);
          float n = fbm(uv * 4.0 + seed);
          // Distort the radial falloff with noise
          float distorted = d + (n - 0.5) * 0.5;
          float soft = 1.0 - smoothstep(0.0, 0.8, distorted);
          soft = soft * soft;
          // Add wispy tendrils
          float tendrils = fbm(uv * 8.0 + seed * 0.5);
          soft *= 0.6 + tendrils * 0.8;
          /*
          0.4, tuned by eye against the live galaxy across three passes: 0.3 was
          invisible ("dim and pretty saturated… too dim"), 1.2 blew out ("way
          too bright"), 0.5 was close, and 0.4 is the settled value once the
          stamps grew 50% — bigger nebulae overlap more, so each wants to be
          slightly fainter to land in the same place.

          The DARK branch below keeps its 0.35: dark nebulae darken, so they
          were never part of the too-dim complaint and a stronger one just blots
          the arm out.
          */
          vec3 col = vColor.rgb * soft * nebulaOpacity * 0.4;
          gl_FragColor = vec4(col, 0.0);
        } else {
          // Dark nebula: turbulent darkening
          float nebulaOpacity = a * 2.0;
          vec2 seed = vec2(vColor.r * 73.0 + 31.0, vColor.g * 157.0 + 59.0);
          float n = fbm(uv * 4.0 + seed);
          float distorted = d + (n - 0.5) * 0.5;
          float soft = 1.0 - smoothstep(0.0, 0.8, distorted);
          soft = soft * soft;
          float tendrils = fbm(uv * 8.0 + seed * 0.5);
          soft *= 0.6 + tendrils * 0.8;
          float alpha = soft * nebulaOpacity * 0.35;
          gl_FragColor = vec4(0.0, 0.0, 0.0, alpha);
        }
      }
    `
  }

  private createShaderMaterial(name: string, scene: BABYLON.Scene) {
    const mat = new BABYLON.ShaderMaterial(
      name,
      scene,
      { vertex: 'galaxyStar', fragment: 'galaxyStar' },
      {
        attributes: ['position', 'uv', 'color'],
        uniforms: ['worldViewProjection'],
        needAlphaBlending: true,
      }
    )
    mat.backFaceCulling = false
    mat.alphaMode = BABYLON.Constants.ALPHA_PREMULTIPLIED
    return mat
  }

  private buildGalaxy() {
    if (this.owner == null || this.rootNode == null) return
    const attrs = this as any
    const scene = this.owner.scene

    // Generate galaxy data (includes nebulae)
    this.galaxyData = generateGalaxy(attrs.seed, attrs.starCount, {
      spiralArms: attrs.spiralArms,
      spiralAngleDegrees: attrs.spiralAngle,
      thickness: attrs.thickness,
    })

    const { stars, nebulae } = this.galaxyData
    const radius: number = attrs.radius
    const particleSize: number = attrs.particleSize
    const scaleFactor = radius / 0.9

    // --- Star SPS (pickable) ---
    const starSps = new BABYLON.SolidParticleSystem('galaxy-stars', scene, {
      isPickable: true,
    })
    const starPlane = BABYLON.MeshBuilder.CreatePlane(
      'star-template',
      { size: particleSize },
      scene
    )
    starSps.addShape(starPlane, stars.length)
    starPlane.dispose()
    starSps.billboard = true

    const starMesh = starSps.buildMesh()
    starMesh.parent = this.rootNode

    starSps.initParticles = () => {
      for (let p = 0; p < stars.length; p++) {
        const particle = starSps.particles[p]
        const star = stars[p]
        particle.position.x = star.position.x * scaleFactor
        particle.position.y = star.position.z * scaleFactor
        particle.position.z = star.position.y * scaleFactor
        particle.scale.x = particle.scale.y = particle.scale.z = star.scale
        particle.color = new BABYLON.Color4(
          star.rgb[0] / 255,
          star.rgb[1] / 255,
          star.rgb[2] / 255,
          1
        )
      }
    }

    starMesh.material = this.createShaderMaterial('galaxy-star-mat', scene)
    starMesh.alwaysSelectAsActiveMesh = true

    starSps.initParticles()
    this.originalColors = stars.map((_s, i) =>
      starSps.particles[i].color!.clone()
    )
    starSps.setParticles()
    starSps.refreshVisibleSize()

    this.starSps = starSps
    this.starMesh = starMesh

    // --- Nebula SPS (not pickable) ---
    if (nebulae.length > 0) {
      const nebulaSps = new BABYLON.SolidParticleSystem(
        'galaxy-nebulae',
        scene,
        { isPickable: false }
      )
      const nebPlane = BABYLON.MeshBuilder.CreatePlane(
        'nebula-template',
        { size: particleSize },
        scene
      )
      nebulaSps.addShape(nebPlane, nebulae.length)
      nebPlane.dispose()
      nebulaSps.billboard = true

      const nebMesh = nebulaSps.buildMesh()
      nebMesh.parent = this.rootNode

      nebulaSps.initParticles = () => {
        for (let n = 0; n < nebulae.length; n++) {
          const particle = nebulaSps.particles[n]
          const neb = nebulae[n]
          particle.position.x = neb.position.x * scaleFactor
          particle.position.y = neb.position.z * scaleFactor
          particle.position.z = neb.position.y * scaleFactor
          particle.scale.x = particle.scale.y = particle.scale.z = neb.scale
          const alpha =
            neb.type === 'emission'
              ? 0.5 + neb.opacity * 0.4
              : neb.opacity * 0.45
          particle.color = new BABYLON.Color4(
            neb.rgb[0] / 255,
            neb.rgb[1] / 255,
            neb.rgb[2] / 255,
            alpha
          )
        }
      }

      nebMesh.material = this.createShaderMaterial('galaxy-nebula-mat', scene)
      nebMesh.alwaysSelectAsActiveMesh = true

      nebulaSps.initParticles()
      nebulaSps.setParticles()
      nebulaSps.refreshVisibleSize()

      this.nebulaSps = nebulaSps
      this.nebulaMesh = nebMesh
    }

    if (!this.registered) {
      this.registered = true
      const meshes = [starMesh]
      if (this.nebulaMesh) meshes.push(this.nebulaMesh)
      this.owner.register({ meshes })
    }
  }

  private buildBlackHole() {
    if (this.owner == null) return
    const attrs = this as any
    const coreSize: number = attrs.coreSize

    // Create a b3dBlackHole element as a child
    this.blackHoleEl = b3dBlackHole({
      radius: coreSize,
      diskInnerRadius: 1.05,
      diskOuterRadius: 1.6,
      diskBrightness: 0.5,
      rotationSpeed: 0.3,
      lensing: true,
      photonRing: true,
      photonRingBrightness: 0.7,
      subdivisions: 32,
    })
    // Append to galaxy's parent (inside the b3d element)
    this.parentElement?.appendChild(this.blackHoleEl)
  }

  /** Get star data at the given index */
  getStarAt(index: number): StarData | null {
    if (!this.galaxyData || index < 0 || index >= this.galaxyData.stars.length)
      return null
    return this.galaxyData.stars[index]
  }

  /** Get full star system (star + planets) at the given index */
  getStarSystem(index: number): StarSystemData | null {
    const star = this.getStarAt(index)
    if (!star) return null
    return generateStarSystem(star)
  }

  /** Get the galaxy data */
  getGalaxyData(): GalaxyData | null {
    return this.galaxyData
  }

  /** Get the star SPS for external picking */
  getStarSPS(): BABYLON.SolidParticleSystem | null {
    return this.starSps
  }

  /** Get the star SPS mesh for pick comparison */
  getStarMesh(): BABYLON.Mesh | null {
    return this.starMesh
  }

  /** Hide a star particle (e.g. to replace it with a star system) */
  hideStarAt(index: number) {
    if (
      !this.galaxyData ||
      !this.starSps ||
      index < 0 ||
      index >= this.galaxyData.stars.length
    )
      return
    this.starSps.particles[index].isVisible = false
  }

  /** Show a previously hidden star particle */
  showStarAt(index: number) {
    if (
      !this.galaxyData ||
      !this.starSps ||
      index < 0 ||
      index >= this.galaxyData.stars.length
    )
      return
    this.starSps.particles[index].isVisible = true
  }

  /** Get the world position of a star particle */
  getStarPosition(index: number): BABYLON.Vector3 | null {
    if (
      !this.starSps ||
      !this.galaxyData ||
      index < 0 ||
      index >= this.galaxyData.stars.length
    )
      return null
    const particle = this.starSps.particles[index]
    const pos = particle.position.clone()
    if (this.rootNode) {
      return BABYLON.Vector3.TransformCoordinates(
        pos,
        this.rootNode.getWorldMatrix()
      )
    }
    return pos
  }

  /** Filter stars: dim those that don't match criteria */
  filterStars(options: { maxHI?: number; nameSearch?: string } = {}) {
    if (!this.starSps || !this.galaxyData || !this.originalColors) return
    const { maxHI = 5, nameSearch = '' } = options
    const needle = nameSearch.toLowerCase()
    const { stars } = this.galaxyData
    for (let i = 0; i < stars.length; i++) {
      const orig = this.originalColors[i]
      const particle = this.starSps.particles[i]
      const hiPass = maxHI >= 5 || stars[i].bestHI <= maxHI
      const namePass = !needle || stars[i].name.toLowerCase().includes(needle)
      if (hiPass && namePass) {
        particle.color = orig.clone()
      } else {
        particle.color = new BABYLON.Color4(
          orig.r * 0.08,
          orig.g * 0.08,
          orig.b * 0.08,
          orig.a
        )
      }
    }
  }

  /** Set visibility of the entire galaxy (0-1) */
  setVisibility(v: number) {
    if (this.starMesh) this.starMesh.visibility = v
    if (this.nebulaMesh) this.nebulaMesh.visibility = v
    if (this.blackHoleEl) {
      ;(this.blackHoleEl as any).setVisibility?.(v)
    }
  }

  /** Rebuild the entire galaxy with current attributes */
  regenerate() {
    this.disposeMeshes()
    if (this.blackHoleEl) {
      this.blackHoleEl.remove()
      this.blackHoleEl = null
    }
    this.registered = false
    this.buildGalaxy()
    this.buildBlackHole()
  }
}

export const b3dGalaxy = B3dGalaxy.elementCreator()
