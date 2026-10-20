import { type B3dPanel } from './b3d-panel.js';
import { type InspectFace, type InspectView } from './inspect-view.js';
export interface BarMenuOption {
    value: string;
    label?: string;
}
export interface BarMenuConfig {
    /** The button's icon (an `svgIcons` name). */
    icon: string;
    /** Its name: the tooltip, and what a screen reader says. */
    title: string;
    options: Array<string | BarMenuOption>;
    value?: string;
    handleChange?: (value: string) => void;
}
export type BarMenu = B3dPanel & {
    value: string;
};
export declare function barMenu(config: BarMenuConfig): BarMenu;
export interface ViewMenuOptions {
    /** The views it offers, in order (default: all six faces, then `free`). */
    faces?: Array<InspectFace | 'free'>;
    /** What each is called (default: `front`, `left side`, … `perspective`). */
    labels?: Partial<Record<InspectFace | 'free', string>>;
    /**
     * Shown in the perspective view too, so the faces can be reached from it.
     * Off (the default), it appears only while a face is held.
     */
    always?: boolean;
    icon?: string;
    title?: string;
}
/**
 * A camera on the system bar that picks an `inspectView`'s face, or
 * `perspective` to leave it: give it the `<tosi-b3d>` to live in. Call
 * `update()` when the face is changed some other way.
 */
export declare function viewMenu(inspect: InspectView, host: Element, options?: ViewMenuOptions): {
    update(): void;
    dispose(): void;
};
//# sourceMappingURL=bar-menu.d.ts.map