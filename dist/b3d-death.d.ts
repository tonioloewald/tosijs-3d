import { B3dChild } from './b3d-utils';
import { type Prefab } from './prefab';
import { type Widget3d } from './widgets3d';
import type { B3d } from './tosi-b3d';
import type { B3dControllable } from './b3d-controllable';
export declare class B3dDeath extends B3dChild {
    static initAttributes: {
        title: string;
        delay: number;
        orbitRadius: number;
        orbitHeight: number;
        orbitSpeed: number;
        spectate: "orbit" | "chase";
        wreckage: "on" | "off";
        blastRadius: number;
    };
    title: string;
    delay: number;
    orbitRadius: number;
    orbitHeight: number;
    orbitSpeed: number;
    spectate: 'orbit' | 'chase';
    wreckage: 'on' | 'off';
    blastRadius: number;
    /** What "Respawn" does. No callback ⇒ no Respawn button (the game may not allow one). */
    respawn: (() => void) | null;
    /** Replace the panel body entirely: Rewind, Spectate, Eject, Quit — whatever the game has. */
    choices: (() => Widget3d[]) | null;
    /** What to leave at the crash site — a [prefab](?prefab.ts) name or factory. Overrides the
     * built-in fire + smoke, so a game can drop a proper wreck model, a crater, a rescue
     * beacon. Cleared when you respawn, along with the built-in burn. */
    remains: string | Prefab | null;
    /** True from the bang until the player picks something. */
    get dying(): boolean;
    private _dying;
    private _wreck;
    private _remains;
    private _orbitCam;
    private _prevCam;
    private _panel;
    private _fires;
    private _charMats;
    private _obs;
    private _timer;
    private _onDeath;
    sceneReady(owner: B3d): void;
    sceneDispose(): void;
    private get focusManager();
    private _handleDeath;
    /** Kill the run. Public so a game can trigger a death that isn't a crash or a hit. */
    die(entity: B3dControllable | null): void;
    private _burn;
    private _showPanel;
    /** Tear down the death state and hand control back — then run `next` (e.g. respawn). */
    resume(next?: () => void): void;
    private _cleanup;
}
export declare const b3dDeath: (...args: unknown[]) => B3dDeath;
//# sourceMappingURL=b3d-death.d.ts.map