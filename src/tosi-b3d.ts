import { Component, elements } from 'tosijs'
import * as BABYLON from '@babylonjs/core'
import * as GUI from '@babylonjs/gui'
import '@babylonjs/loaders'

const { canvas, div, slot } = elements

export type SceneAdditionHandler = (additions: SceneAdditions) => void

export type SceneAdditions = {
  meshes?: BABYLON.AbstractMesh[]
  lights?: BABYLON.Light[]
}

type B3dCallback =
  | ((element: B3d, BABYLON: typeof import('@babylonjs/core')) => void)
  | ((element: B3d, BABYLON: typeof import('@babylonjs/core')) => Promise<void>)

// eslint-disable-next-line @typescript-eslint/no-empty-function
const noop = () => {}

export class B3d extends Component {
  static initAttributes = {
    glowLayerIntensity: 0,
    frameRate: 30,
  }

  static styleSpec = {
    ':host': {
      display: 'block',
      position: 'relative',
      overflow: 'hidden',
      background: '#000',
    },
    ':host .spinner': {
      position: 'absolute',
      top: '50%',
      left: '50%',
      width: '48px',
      height: '48px',
      marginTop: '-24px',
      marginLeft: '-24px',
      border: '4px solid rgba(255,255,255,0.15)',
      borderTopColor: '#fff',
      borderRadius: '50%',
      animation: 'tosi-spin 0.8s linear infinite',
      transition: 'opacity 0.3s ease-out',
    },
    ':host .spinner.hidden': {
      opacity: '0',
      pointerEvents: 'none',
    },
    '@keyframes tosi-spin': {
      to: { transform: 'rotate(360deg)' },
    },
    ':host canvas': {
      position: 'absolute',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      opacity: '0',
      transition: 'opacity 0.5s ease-in',
    },
    ':host canvas.ready': {
      opacity: '1',
    },
    ':host .babylonVRicon': {
      height: 50,
      width: 80,
      backgroundColor: 'transparent',
      filter: 'drop-shadow(0 0 4px #000c)',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      border: 'none',
      borderRadius: 5,
      borderStyle: 'none',
      outline: 'none',
      transition: 'transform 0.125s ease-out',
    },
    ':host .babylonVRicon:hover': {
      transform: 'scale(1.1)',
    },
  }

  content = [
    div({ class: 'spinner', part: 'spinner' }),
    canvas({ part: 'canvas' }),
    slot(),
  ]

  engine!: BABYLON.Engine
  scene!: BABYLON.Scene
  camera?: BABYLON.Camera
  gui?: GUI.GUI3DManager
  glowLayer?: BABYLON.GlowLayer
  xrActive = false
  BABYLON = BABYLON

  sceneCreated: B3dCallback = noop
  update: B3dCallback = noop

  private lastRender = 0
  private sceneListeners: SceneAdditionHandler[] = []
  private pastAdditions: SceneAdditions[] = []

  onSceneAddition(callback: SceneAdditionHandler): void {
    this.sceneListeners.push(callback)
    for (const additions of this.pastAdditions) {
      callback(additions)
    }
  }

  offSceneAddition(callback: SceneAdditionHandler): void {
    const idx = this.sceneListeners.indexOf(callback)
    if (idx > -1) {
      this.sceneListeners.splice(idx, 1)
    }
  }

  register(additions: SceneAdditions): void {
    this.pastAdditions.push(additions)
    for (const callback of this.sceneListeners) {
      callback(additions)
    }
  }

  setActiveCamera(
    camera: BABYLON.Camera,
    options: { attach?: boolean; preventDefault?: boolean } = {}
  ): void {
    const { attach = true, preventDefault = false } = options
    const cnv = this.parts.canvas as HTMLCanvasElement
    if (this.camera != null) {
      this.camera.detachControl()
    }
    this.camera = camera
    this.scene.activeCamera = camera
    if (attach) {
      camera.attachControl(cnv, preventDefault)
    }
  }

  private _update = () => {
    if (this.scene != null && !this.hidden) {
      if (this.update !== noop) {
        this.update(this, BABYLON)
      }
      const now = Date.now()
      if (
        this.xrActive ||
        now - this.lastRender >= 1000 / (this as any).frameRate
      ) {
        this.lastRender = now
        if (this.scene.activeCamera !== undefined) {
          this.scene.render()
        }
      }
    }
  }

  private _resizing = false
  onResize() {
    if (this.engine && !this._resizing) {
      this._resizing = true
      this.engine.resize()
      this._resizing = false
    }
  }

  loadScene = async (
    path: string,
    file: string,
    processCallback?: (scene: BABYLON.Scene) => void
  ): Promise<void> => {
    BABYLON.SceneLoader.Append(path, file, this.scene, processCallback)
  }

  connectedCallback(): void {
    super.connectedCallback()
    const cnv = this.parts.canvas as HTMLCanvasElement
    this.engine = new BABYLON.Engine(cnv, true, {
      preserveDrawingBuffer: true,
      stencil: true,
    })
    this.scene = new BABYLON.Scene(this.engine)
    this.scene.collisionsEnabled = true
    this.scene.gravity = new BABYLON.Vector3(0, -9.81 / 60, 0)

    const init = async () => {
      if (this.sceneCreated !== noop) {
        await this.sceneCreated(this, BABYLON)
      }
      if (this.scene.activeCamera === undefined) {
        const camera = new BABYLON.UniversalCamera(
          'default-camera',
          new BABYLON.Vector3(5, 1.5, 5),
          this.scene
        )
        camera.setTarget(BABYLON.Vector3.Zero())
        camera.attachControl(cnv, false)
        this.setActiveCamera(camera)
      }
      this.gui = new GUI.GUI3DManager(this.scene)
      this.engine.runRenderLoop(this._update)

      // Fade in canvas once all assets are loaded
      const spinner = this.parts.spinner as HTMLElement
      const checkReady = () => {
        if (this.scene.getWaitingItemsCount() === 0) {
          this.scene.executeWhenReady(() => {
            cnv.classList.add('ready')
            spinner.classList.add('hidden')
          })
        } else {
          setTimeout(checkReady, 100)
        }
      }
      // Start checking after a brief delay to let child components begin loading
      setTimeout(checkReady, 100)
    }

    init()
  }

  render(): void {
    super.render()
    const intensity = (this as any).glowLayerIntensity
    if (intensity > 0) {
      if (!this.glowLayer) {
        this.glowLayer = new BABYLON.GlowLayer('glow', this.scene)
      }
      this.glowLayer.intensity = intensity
    } else if (this.glowLayer) {
      this.glowLayer.dispose()
      this.glowLayer = undefined
    }
  }
}

export const b3d = B3d.elementCreator({ tag: 'tosi-b3d' })
