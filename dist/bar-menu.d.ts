import { type B3dPanel } from './b3d-panel.js';
import { type InspectFace, type InspectView } from './inspect-view.js';
export interface BarMenuOption {
    /** What picking it chooses (a select's option); defaults to `label`. */
    value?: string;
    label?: string;
    /**
     * Its icon (an `svgIcons` name). When every option has one and the layout
     * is not `list`, the menu is a TOOLBAR: one row of icons, each named by its
     * tooltip. In a list, the icon sits beside the caption.
     */
    icon?: string;
    /** An ACTION: called when picked (it is not a choice, so no tick). */
    handleSelect?: () => void;
    /** A SUBMENU, opened in place of the list, with a way back. */
    items?: Array<string | BarMenuOption> | (() => Array<string | BarMenuOption>);
    /** A rule between groups. */
    separator?: boolean;
    /** Shown, but not pickable. */
    disabled?: boolean;
    /** An action with a tick (the character on screen in a list of saves). */
    checked?: boolean;
}
export interface BarMenuConfig {
    /** The button's icon (an `svgIcons` name). */
    icon: string;
    /** Its name: the tooltip, and what a screen reader says. */
    title: string;
    /** Its options, or a function read each time the menu opens. */
    options: Array<string | BarMenuOption> | (() => Array<string | BarMenuOption>);
    value?: string;
    handleChange?: (value: string) => void;
    /**
     * `list`: one row per option, icon and caption. `toolbar`: a row of icons.
     * Default: a toolbar when every option has an icon, else a list.
     */
    layout?: 'list' | 'toolbar';
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
    /**
     * Views of the page's own beside the faces (the character builder's hand
     * view): `select` enters one, `leave` is called when another view is
     * picked, `active` says whether it is the view shown now.
     */
    extras?: ViewMenuExtra[];
}
/** A view of the page's own in a `viewMenu`. */
export interface ViewMenuExtra {
    value: string;
    label: string;
    icon: string;
    select(): void;
    leave(): void;
    active(): boolean;
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