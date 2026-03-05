export interface TosiButton {
  index: number
  pressed: boolean
  value: number
}

export interface TosiGamepad {
  id: string
  axes: number[]
  buttons: { [key: number]: number }
}

export function gamepadState(): TosiGamepad[] {
  const gamepads: Gamepad[] = navigator
    .getGamepads()
    .filter((p) => p !== null) as Gamepad[]

  return gamepads.map((p) => {
    const { id, axes, buttons } = p
    return {
      id,
      axes: Array.from(axes),
      buttons: buttons
        .map((button, index) => ({
          index,
          pressed: button.pressed,
          value: button.value,
        }))
        .filter((b) => b.pressed || b.value !== 0)
        .reduce((map: { [key: number]: number }, button) => {
          map[button.index] = button.value
          return map
        }, {} as { [key: number]: number }),
    }
  })
}

export function gamepadText(): string {
  const state = gamepadState()
  return state.length === 0
    ? 'no active gamepads'
    : state
        .map(({ id, axes, buttons }) => {
          const axesText = axes.map((a) => a.toFixed(2)).join(' ')
          const buttonText = Object.keys(buttons)
            .map((key) => `[${key}](${buttons[Number(key)].toFixed(2)})`)
            .join(' ')
          return `${id}\n${axesText}\n${buttonText}`
        })
        .join('\n')
}

export interface TosiXRControllerComponentState {
  pressed: boolean
  touched: boolean
  value: number
  axes: { x: number; y: number }
}

export interface TosiXRControllerState {
  [key: string]: TosiXRControllerComponentState
}

export interface TosiXRControllerMap {
  [key: string]: TosiXRControllerState
}

export function xrControllers(xrHelper: any): TosiXRControllerMap {
  const controllers: TosiXRControllerMap = {}
  xrHelper.input.onControllerAddedObservable.add((controller: any) => {
    controller.onMotionControllerInitObservable.add((mc: any) => {
      const state: TosiXRControllerState = {}
      const componentIds = mc.getComponentIds() as string[]
      componentIds.forEach((componentId: string) => {
        const component = mc.getComponent(componentId)
        state[componentId] = {
          pressed: component.pressed as boolean,
          touched: component.touched as boolean,
          value: component.value as number,
          axes: { x: component.axes.x, y: component.axes.y },
        }
        component.onButtonStateChangedObservable.add(
          (c: { pressed: boolean; touched: boolean; value: number }) => {
            state[componentId].pressed = c.pressed
            state[componentId].touched = c.touched
            state[componentId].value = c.value
          }
        )
        if (component.onAxisValueChangedObservable) {
          component.onAxisValueChangedObservable.add(
            (axes: { x: number; y: number }) => {
              state[componentId].axes = { x: axes.x, y: axes.y }
            }
          )
        }
      })
      controllers[mc.handedness] = state
    })
  })
  return controllers
}

export function xrControllersText(controllers?: TosiXRControllerMap): string {
  if (controllers === undefined || Object.keys(controllers).length === 0) {
    return 'no xr inputs'
  }

  return Object.keys(controllers)
    .map((controllerId) => {
      const state = controllers[controllerId]
      const parts: string[] = []
      for (const [id, comp] of Object.entries(state)) {
        const flags: string[] = []
        if (comp.pressed) flags.push('P')
        if (comp.touched) flags.push('T')
        const hasValue = comp.value > 0
        const hasAxes = comp.axes.x !== 0 || comp.axes.y !== 0
        if (flags.length > 0 || hasValue || hasAxes) {
          let text = `${id}[${flags.join('')}]`
          if (hasValue) text += ` v:${comp.value.toFixed(2)}`
          if (hasAxes)
            text += ` x:${comp.axes.x.toFixed(2)} y:${comp.axes.y.toFixed(2)}`
          parts.push(text)
        }
      }
      return `${controllerId}\n${parts.join('\n') || '(idle)'}`
    })
    .join('\n')
}
