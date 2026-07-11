import { B3dControllable } from './b3d-controllable';
import { CompositeInputProvider } from './control-input';
import { bipedMapping, carMapping, aircraftMapping, } from './virtual-gamepad';
import { gameController } from './game-controller';
const MAPPINGS = {
    biped: () => bipedMapping,
    car: () => carMapping,
    aircraft: () => aircraftMapping(),
};
export class B3dController extends B3dControllable {
    static initAttributes = {
        ...B3dControllable.initAttributes,
        mapping: 'biped',
        // player so a wrapping <tosi-b3d-input-focus> (if any) would focus us.
        player: true,
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
export const b3dController = B3dController.elementCreator({
    tag: 'tosi-b3d-controller',
});
//# sourceMappingURL=b3d-controller.js.map