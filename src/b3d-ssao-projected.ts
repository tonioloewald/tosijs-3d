/*
PROJECTED AMBIENT OCCLUSION — experimental, and the only kind that can run in a
headset. `<tosi-b3d ssao="on" ssaoMethod="projected">`.

Babylon's SSAO is a post-process: it composites one full-frame image, and on a
WebXR camera that is one image across both eyes (see b3d-ssao.ts, "Flat only").
This does the same sum somewhere else. Occlusion is computed ONCE, from a
camera between the eyes, into a texture. Every lit material then looks its own
pixel up in that texture BY WORLD POSITION, the way cloud shadows and caustics
do. So:

- it is correct in stereo: each eye shades its own pixels, and the darkening is
  glued to the surface, not to the screen;
- nothing is post-processed, so the canvas keeps its antialiasing (and a
  headset keeps foveation);
- it need not be recomputed every frame. The lookup uses the matrix the
  texture was drawn with, so a stale texture stays where it was in the world
  while the head moves. `rate` is how many times a second it is redrawn.

What it costs: one depth pass over the opaque scene per update, plus two small
full-screen passes, plus two texture reads per lit pixel.

What it cannot do: darken a surface the middle camera could not see. Those
pixels fail the depth check and are left alone, which shows as a thin
unoccluded sliver beside a near object, never as a ghost.
*/

import * as BABYLON from '@babylonjs/core'

export interface ProjectedAoParams {
  active: boolean
  /** How dark a fully occluded crease gets. */
  strength: number
  /** Metres a surface looks for occluders. */
  radius: number
  samples: number
  /** Resolution as a fraction of the frame. */
  ratio: number
  /** Redraws per second. 0 = every frame. */
  rate: number
}

const AO_SHADER = 'tosiProjectedAo'
const BLUR_SHADER = 'tosiProjectedAoBlur'
const MAX_SAMPLES = 32

BABYLON.Effect.ShadersStore[`${AO_SHADER}PixelShader`] = `
precision highp float;
varying vec2 vUV;
uniform sampler2D depthSampler;
// xy = tan(half fov) for x and y, zw = 1 / texture size
uniform vec4 aoFrustum;
// x = radius (m), y = strength, z = sample count
uniform vec3 aoParams;

vec3 viewPos(vec2 uv) {
  float z = texture2D(depthSampler, uv).r;
  return vec3((uv * 2.0 - 1.0) * aoFrustum.xy * z, z);
}

void main(void) {
  vec3 p = viewPos(vUV);
  if (p.z <= 0.0) { gl_FragColor = vec4(1.0); return; }

  // The normal from depth alone: of each pair of neighbours take the one
  // nearer in depth, so the normal does not smear across a silhouette.
  vec2 px = aoFrustum.zw;
  vec3 l = viewPos(vUV - vec2(px.x, 0.0)), r = viewPos(vUV + vec2(px.x, 0.0));
  vec3 d = viewPos(vUV - vec2(0.0, px.y)), u = viewPos(vUV + vec2(0.0, px.y));
  vec3 dx = abs(l.z - p.z) < abs(r.z - p.z) ? p - l : r - p;
  vec3 dy = abs(d.z - p.z) < abs(u.z - p.z) ? p - d : u - p;
  vec3 n = normalize(cross(dy, dx));

  // Each sample is a real point on a real neighbouring surface, and counts by
  // how far it rises above this pixel's tangent plane. (Testing a point in
  // space against the depth buffer instead darkens every silhouette, because
  // a point just behind a curved edge is hidden without being an occluder.)
  float spin = 6.2831853 * fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
  float count = aoParams.z;
  float radius = aoParams.x;
  // The radius as a fraction of the picture at this depth, capped so a
  // close-up does not sample half the screen.
  vec2 reach = min(vec2(radius) / (p.z * aoFrustum.xy) * 0.5, vec2(0.25));
  float occlusion = 0.0;
  for (int i = 0; i < ${MAX_SAMPLES}; i++) {
    if (float(i) >= count) break;
    float t = (float(i) + 0.5) / count;
    float a = spin + float(i) * 2.3999632;
    vec2 uv = vUV + vec2(cos(a), sin(a)) * reach * t;
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) continue;
    vec3 q = viewPos(uv);
    if (q.z <= 0.0) continue;
    vec3 v = q - p;
    float far = dot(v, v) / (radius * radius);
    float rise = dot(n, v) / (length(v) + 0.0001);
    occlusion += max(0.0, rise - 0.1) * max(0.0, 1.0 - far);
  }
  occlusion *= 2.5;
  float ao = clamp(1.0 - aoParams.y * occlusion / count, 0.0, 1.0);
  gl_FragColor = vec4(ao, ao, ao, 1.0);
}`

BABYLON.Effect.ShadersStore[`${BLUR_SHADER}PixelShader`] = `
precision highp float;
varying vec2 vUV;
uniform sampler2D aoSampler;
uniform sampler2D depthSampler;
uniform vec2 aoTexel;

void main(void) {
  float z = texture2D(depthSampler, vUV).r;
  float sum = 0.0;
  float weight = 0.0;
  for (int x = -2; x <= 2; x++) {
    for (int y = -2; y <= 2; y++) {
      vec2 uv = vUV + vec2(float(x), float(y)) * aoTexel;
      float zs = texture2D(depthSampler, uv).r;
      // Do not blur across a depth edge.
      float w = 1.0 / (1.0 + 400.0 * abs(zs - z) / max(z, 0.01));
      sum += texture2D(aoSampler, uv).r * w;
      weight += w;
    }
  }
  float ao = sum / max(weight, 0.0001);
  gl_FragColor = vec4(ao, ao, ao, 1.0);
}`

/**
 * Owns the projected-occlusion textures for one scene and the hook on every
 * material that reads them. `<tosi-b3d>` drives it.
 */
export class ProjectedAoController {
  private _camera: BABYLON.FreeCamera | null = null
  private _depth: BABYLON.DepthRenderer | null = null
  private _ao: BABYLON.ProceduralTexture | null = null
  private _blur: BABYLON.ProceduralTexture | null = null
  private _plugins: ProjectedAoPlugin[] = []
  private _frameObs: BABYLON.Nullable<BABYLON.Observer<BABYLON.Scene>> = null
  private _materialObs: BABYLON.Nullable<BABYLON.Observer<BABYLON.Material>> =
    null
  private _built = { width: 0, height: 0 }
  private _params: ProjectedAoParams | null = null
  private _lastDraw = -Infinity
  private _warmUp = 0
  private _tan = { x: 1, y: 1 }

  /** The view-projection the textures were last drawn with. */
  readonly viewProjection = BABYLON.Matrix.Identity()
  /** Debug: how many times the occlusion has been redrawn. */
  draws = 0

  constructor(private _scene: BABYLON.Scene) {}

  get running(): boolean {
    return this._blur != null
  }

  get texture(): BABYLON.Nullable<BABYLON.BaseTexture> {
    return this._blur
  }

  get depthTexture(): BABYLON.Nullable<BABYLON.BaseTexture> {
    return this._depth?.getDepthMap() ?? null
  }

  get attachedCount(): number {
    return this._plugins.length
  }

  update(p: ProjectedAoParams): void {
    const scene = this._scene
    if (!p.active || scene.activeCamera == null || scene.isDisposed) {
      this.dispose()
      return
    }
    this._params = p
    if (this._frameObs == null) {
      this._frameObs = scene.onBeforeRenderObservable.add(() => this._frame())
      this._materialObs = scene.onNewMaterialAddedObservable.add((m) =>
        // A material is announced from its constructor, before a subclass has
        // finished building: attach once it exists.
        setTimeout(() => this._attach(m), 0)
      )
    }
  }

  dispose(): void {
    const scene = this._scene
    if (this._frameObs != null) {
      scene.onBeforeRenderObservable.remove(this._frameObs)
      scene.onNewMaterialAddedObservable.remove(this._materialObs)
      this._frameObs = null
      this._materialObs = null
    }
    for (const plugin of this._plugins) {
      plugin.isEnabled = false
      plugin.controller = null
    }
    this._plugins = []
    this._disposeTextures()
    this._camera?.dispose()
    this._camera = null
  }

  private _disposeTextures(): void {
    const scene = this._scene
    const map = this._depth?.getDepthMap()
    if (map != null && !scene.isDisposed) {
      const i = scene.customRenderTargets.indexOf(map)
      if (i >= 0) scene.customRenderTargets.splice(i, 1)
    }
    this._depth?.dispose()
    this._ao?.dispose()
    this._blur?.dispose()
    this._depth = null
    this._ao = null
    this._blur = null
    this._built = { width: 0, height: 0 }
  }

  private _attach(material: BABYLON.Material): void {
    if (this._frameObs == null) return
    // Only materials that take plugins, and only ones something might light.
    if (
      !(material instanceof BABYLON.StandardMaterial) &&
      !(material instanceof BABYLON.PBRBaseMaterial)
    ) {
      return
    }
    let plugin = material.pluginManager?.getPlugin(
      'ProjectedAo'
    ) as ProjectedAoPlugin | null
    if (plugin == null) plugin = new ProjectedAoPlugin(material)
    if (!this._plugins.includes(plugin)) this._plugins.push(plugin)
    plugin.controller = this
    plugin.isEnabled = true
  }

  /**
   * Point the middle camera where the viewer is looking, with a frustum that
   * covers everything either eye can see. Returns false if there is no viewer.
   */
  private _aim(): boolean {
    const scene = this._scene
    const viewer = scene.activeCamera
    if (viewer == null) return false
    if (this._camera == null) {
      const cam = new BABYLON.FreeCamera(
        'projected-ao',
        BABYLON.Vector3.Zero(),
        scene,
        false
      )
      cam.rotationQuaternion = BABYLON.Quaternion.Identity()
      // It is never the active camera and never takes input.
      scene.removeCamera(cam)
      this._camera = cam
    }
    const cam = this._camera
    // The widest half-angle any eye needs, plus the little the eyes sit apart.
    let tanX = 0
    let tanY = 0
    const eyes = viewer.rigCameras.length > 0 ? viewer.rigCameras : [viewer]
    for (const eye of eyes) {
      const m = eye.getProjectionMatrix().m
      if (m[0] === 0 || m[5] === 0) continue
      tanX = Math.max(tanX, (1 + Math.abs(m[8])) / Math.abs(m[0]))
      tanY = Math.max(tanY, (1 + Math.abs(m[9])) / Math.abs(m[5]))
    }
    if (tanX === 0 || tanY === 0) return false
    if (eyes.length > 1) {
      tanX *= 1.08
      tanY *= 1.04
    }
    this._tan = { x: tanX, y: tanY }
    viewer
      .getWorldMatrix()
      .decompose(undefined, cam.rotationQuaternion!, cam.position)
    cam.minZ = viewer.minZ
    cam.maxZ = viewer.maxZ
    cam.fov = 2 * Math.atan(tanY)
    cam.fovMode = BABYLON.Camera.FOVMODE_VERTICAL_FIXED
    return true
  }

  private _build(width: number, height: number): void {
    const scene = this._scene
    const cam = this._camera!
    this._disposeTextures()
    // Full floats where the device can draw to them. Half floats step by
    // several millimetres ten metres out, and a normal worked out from depth
    // turns those steps into stripes across any surface seen at a glancing angle.
    const depthType = scene.getEngine().getCaps().textureFloatRender
      ? BABYLON.Constants.TEXTURETYPE_FLOAT
      : BABYLON.Constants.TEXTURETYPE_HALF_FLOAT
    const target = new BABYLON.RenderTargetTexture(
      'projected-ao-depth',
      { width, height },
      scene,
      false,
      true,
      depthType,
      false,
      BABYLON.Texture.NEAREST_SAMPLINGMODE,
      undefined,
      undefined,
      undefined,
      BABYLON.Constants.TEXTUREFORMAT_R
    )
    // Camera-space Z in metres, and 0 where there is nothing (the sky).
    this._depth = new BABYLON.DepthRenderer(
      scene,
      depthType,
      cam,
      false,
      BABYLON.Texture.NEAREST_SAMPLINGMODE,
      true,
      'projected-ao-depth',
      target
    )
    const map = this._depth.getDepthMap()
    map.activeCamera = cam
    map.wrapU = BABYLON.Texture.CLAMP_ADDRESSMODE
    map.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE
    // Drawn when WE say, not every frame: see `_frame`.
    map.refreshRate = BABYLON.RenderTargetTexture.REFRESHRATE_RENDER_ONCE
    scene.customRenderTargets.push(map)

    const pass = (name: string, shader: string): BABYLON.ProceduralTexture => {
      const t = new BABYLON.ProceduralTexture(
        name,
        { width, height },
        shader,
        scene,
        null,
        false
      )
      t.wrapU = BABYLON.Texture.CLAMP_ADDRESSMODE
      t.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE
      t.refreshRate = 0
      return t
    }
    this._ao = pass('projected-ao', AO_SHADER)
    this._blur = pass('projected-ao-blur', BLUR_SHADER)
    this._ao.setTexture('depthSampler', map)
    this._blur.setTexture('aoSampler', this._ao)
    this._blur.setTexture('depthSampler', map)
    this._blur.setVector2('aoTexel', new BABYLON.Vector2(1 / width, 1 / height))
    this._built = { width, height }
  }

  private _frame(): void {
    const p = this._params
    const scene = this._scene
    if (p == null || scene.activeCamera == null) return
    const now = performance.now()
    // Shaders compile asynchronously and a mesh whose depth shader is not
    // ready is simply left out of that drawing. So the first drawings after a
    // build are not rate-limited, or a slow rate would keep a picture with
    // holes in it.
    const limited = p.rate > 0 && this._warmUp <= 0
    if (limited && now - this._lastDraw < 1000 / p.rate - 1) return
    if (this._warmUp > 0) this._warmUp--
    if (!this._aim()) return
    this._lastDraw = now

    const engine = scene.getEngine()
    // The middle camera's picture is wider than one eye's, so size it by the
    // frame's HEIGHT and its own aspect.
    const height = Math.max(
      64,
      Math.round(engine.getRenderHeight() * p.ratio * 0.5) * 2
    )
    const width = Math.max(
      64,
      Math.round((height * this._tan.x) / this._tan.y / 2) * 2
    )
    if (
      this._blur == null ||
      this._built.width !== width ||
      this._built.height !== height
    ) {
      this._build(width, height)
      this._warmUp = 30
      for (const material of scene.materials) this._attach(material)
    }
    const cam = this._camera!
    // Frozen, because a camera works out its aspect from whatever is bound
    // when it is asked, and that is not reliably this texture.
    const projection = BABYLON.Matrix.PerspectiveFovLH(
      cam.fov,
      width / height,
      cam.minZ,
      cam.maxZ,
      engine.isNDCHalfZRange
    )
    cam.freezeProjectionMatrix(projection)
    // What the lookup must use is the matrix THIS drawing was made with.
    cam.getViewMatrix(true).multiplyToRef(projection, this.viewProjection)
    this._ao!.setColor4(
      'aoFrustum',
      new BABYLON.Color4(this._tan.x, this._tan.y, 1 / width, 1 / height)
    )
    this._ao!.setVector3(
      'aoParams',
      new BABYLON.Vector3(
        p.radius,
        p.strength,
        Math.min(MAX_SAMPLES, Math.max(4, p.samples))
      )
    )
    this._depth!.getDepthMap().resetRefreshCounter()
    this._ao!.resetRefreshCounter()
    this._blur!.resetRefreshCounter()
    this.draws++
  }
}

class ProjectedAoPlugin extends BABYLON.MaterialPluginBase {
  controller: ProjectedAoController | null = null
  private _isEnabled = false

  constructor(material: BABYLON.Material) {
    super(material, 'ProjectedAo', 220, { PROJECTED_AO: false })
  }

  get isEnabled(): boolean {
    return this._isEnabled
  }

  set isEnabled(enabled: boolean) {
    if (this._isEnabled === enabled) return
    this._isEnabled = enabled
    this.markAllDefinesAsDirty()
    this._enable(enabled)
  }

  prepareDefines(defines: BABYLON.MaterialDefines): void {
    defines.PROJECTED_AO = this._isEnabled && this.controller?.texture != null
  }

  getClassName(): string {
    return 'ProjectedAoPlugin'
  }

  getSamplers(samplers: string[]): void {
    samplers.push('projectedAoSampler', 'projectedAoDepthSampler')
  }

  getUniforms(): {
    ubo: { name: string; size: number; type: string }[]
    fragment: string
  } {
    return {
      ubo: [{ name: 'projectedAoMatrix', size: 16, type: 'mat4' }],
      fragment: `#ifdef PROJECTED_AO
        uniform mat4 projectedAoMatrix;
      #endif`,
    }
  }

  bindForSubMesh(uniformBuffer: BABYLON.UniformBuffer): void {
    const c = this.controller
    const ao = c?.texture
    const depth = c?.depthTexture
    if (!this._isEnabled || c == null || ao == null || depth == null) return
    uniformBuffer.updateMatrix('projectedAoMatrix', c.viewProjection)
    uniformBuffer.setTexture('projectedAoSampler', ao)
    uniformBuffer.setTexture('projectedAoDepthSampler', depth)
  }

  getCustomCode(shaderType: string): { [pointName: string]: string } | null {
    if (shaderType !== 'fragment') return null
    return {
      CUSTOM_FRAGMENT_DEFINITIONS: `#ifdef PROJECTED_AO
        uniform sampler2D projectedAoSampler;
        uniform sampler2D projectedAoDepthSampler;
      #endif`,
      CUSTOM_FRAGMENT_MAIN_END: `#ifdef PROJECTED_AO
      {
        vec4 aoClip = projectedAoMatrix * vec4(vPositionW, 1.0);
        if (aoClip.w > 0.0) {
          vec2 aoUv = aoClip.xy / aoClip.w * 0.5 + 0.5;
          // Fade out toward the edge of what the middle camera saw, so a
          // stale picture ends softly as the head turns.
          vec2 aoEdge = smoothstep(vec2(0.0), vec2(0.04), aoUv) * smoothstep(vec2(0.0), vec2(0.04), 1.0 - aoUv);
          float aoSeen = texture2D(projectedAoDepthSampler, aoUv).r;
          // Only where the middle camera saw THIS surface: clip w is its depth.
          float aoMatch = 1.0 - smoothstep(0.02, 0.05, abs(aoSeen - aoClip.w) / aoClip.w);
          float aoValue = texture2D(projectedAoSampler, aoUv).r;
          gl_FragColor.rgb *= mix(1.0, aoValue, aoEdge.x * aoEdge.y * aoMatch);
        }
      }
      #endif`,
    }
  }
}

// In the registry, or Material.clone() throws on a material that carries it
// (the same trap cloud-shadows documents).
BABYLON.RegisterMaterialPlugin(
  'ProjectedAoPlugin',
  (material) => new ProjectedAoPlugin(material)
)
