import { B3dControllable } from './b3d-controllable.js';
import { CompositeInputProvider } from './control-input.js';
import { bipedMapping, carMapping, aircraftMapping, } from './virtual-gamepad.js';
import { gameController } from './game-controller.js';
const MAPPINGS = {
    biped: () => bipedMapping,
    car: () => carMapping,
    aircraft: () => aircraftMapping(),
};
export class B3dController extends B3dControllable {
    static preferredTagName = 'tosi-b3d-controller';
    static initAttributes = {
        ...B3dControllable.initAttributes,
        mapping: 'biped',
        // MUST default false: HTML boolean attributes can't default to true (an absent attribute
        // is false), and tosijs now THROWS at construction on a true default — which silently broke
        // this whole component (the ctor threw, so its sceneReady never wired any input). If you
        // nest a b3dController inside <tosi-b3d-input-focus> and want that manager (not its own
        // self-wiring) to drive it, set `player` explicitly — same as b3dBiped/b3dAircraft.
        player: false,
    };
    /**
     * Called every frame with the merged `ControlInput` and `dt` — THE seam. Set in
     * code or via the element creator. Read `input.forward/turn/shoot/…` and drive
     * anything (a launcher, a custom rig, an experiment).
     *
     * NOTE: deliberately NOT named `onInput` — the element creator treats `on*` props as
     * DOM event listeners, so an `onInput` prop would silently become an `input`-event
     * handler and never be called here.
     */
    drive = null;
    /** The merged input provider — exposed so the XR rig can add its controller source. */
    inputMappedProvider = null;
    _gc = null;
    sceneReady(owner, scene) {
        super.sceneReady(owner, scene);
        this.inputMapping = (MAPPINGS[this.mapping] ?? MAPPINGS.biped)();
        // Self-wire the standard controller (keyboard/mouse + on-screen glass gamepad +
        // hardware pad), unless we're inside a <tosi-b3d-input-focus>, which drives us.
        if (this.closest('tosi-b3d-input-focus') == null) {
            const gc = gameController();
            this._gc = gc;
            owner.appendChild(gc);
            const provider = gc.getInputProvider(this.inputMapping);
            const glass = owner.querySelector('tosi-b3d-gamepad');
            if (glass != null)
                provider.addSource(glass);
            this.inputMappedProvider = provider;
            this.inputProvider = new CompositeInputProvider(provider);
        }
        owner.scene.registerBeforeRender(this._update);
    }
    applyInput(input, dt) {
        this.drive?.(input, dt);
    }
    sceneDispose() {
        this.owner?.scene.unregisterBeforeRender(this._update);
        if (this._gc != null) {
            this._gc.remove();
            this._gc = null;
        }
        this.inputMappedProvider = null;
        super.sceneDispose();
    }
}
export const b3dController = B3dController.elementCreator();
//# sourceMappingURL=b3d-controller.js.map