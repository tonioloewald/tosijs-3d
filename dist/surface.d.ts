import { type FlowBox, type PopupSide } from './flow-layout';
import { type Box, type PointerKind } from './box';
/** A live popup on a {@link Surface}. */
export interface Popup {
    box: Box;
    el: SVGGElement;
    x: number;
    y: number;
    side: PopupSide;
    /** `menu` = transient cascade (outside-press dismisses); `panel` = persistent floating window. */
    kind: 'menu' | 'panel';
    /** Draggable by its title bar (panels only). */
    draggable: boolean;
    /** Title-bar height = the drag zone; 0 for menus. */
    dragHeight: number;
    /** Close-button hit region in popup-local coords (panels only). */
    closeRect?: FlowBox;
    /** Close this popup (a menu closes its cascade from here down). */
    close: () => void;
}
export interface Surface {
    /** Root `<g>` — content layer + overlay layer. */
    el: SVGGElement;
    width: number;
    height: number;
    /** Set (or replace) the main content box — its pointer gets events when no popup is open. */
    setContent: (b: Box) => void;
    /** Open a transient **menu** popup anchored to `anchor` (cascade). */
    openPopup: (anchor: FlowBox, popupBox: Box, side?: PopupSide) => Popup;
    /**
     * Open a persistent, draggable, closable **panel** (a floating window with a
     * title bar). `at` is an anchor rect (placed below it) or an absolute `{x,y}`.
     * It stays until closed via its × or {@link closePopup} — an outside press does
     * NOT dismiss it.
     */
    openPanel: (at: FlowBox | {
        x: number;
        y: number;
    }, content: Box, opts?: {
        title?: string;
        draggable?: boolean;
        onClose?: () => void;
    }) => Popup;
    /** Close one popup. */
    closePopup: (p: Popup) => void;
    /**
     * Is (x, y) over something interactive? Any popup counts wholesale (panels
     * drag by their bar and close by their ×); otherwise the content box is
     * asked. `panelScene`'s default claim uses this — see Box.interactiveAt.
     */
    interactiveAt: (x: number, y: number) => boolean;
    /** Close every popup (menus + panels). */
    closeAll: () => void;
    /**
     * Close the open menu cascade only — panels survive. This is what a menu
     * leaf-select uses: `closeAll` there destroyed persistent panels, breaking
     * openPanel's "stays until closed" contract (caught by the rc.1 review).
     */
    closeMenus: () => void;
    /**
     * Route a pointer event (surface coords). With popups open, the top-most one
     * captures and a `down` outside all of them dismisses; otherwise the content box
     * gets it.
     */
    handlePointer: (kind: PointerKind, x: number, y: number) => void;
    /** Popups currently open, bottom → top. */
    readonly popups: Popup[];
    [scratch: string]: unknown;
}
export declare function surface(opts: {
    width: number;
    height: number;
}): Surface;
export interface MenuItem {
    label: string;
    onSelect?: (item: MenuItem) => void;
    submenu?: MenuItem[];
}
/**
 * Open a cascade menu on `s`, anchored to `anchor` (surface coords). A leaf item
 * selects and closes the whole menu; a `submenu` item opens a child popup to its
 * right (flipping left near the edge). The parent stays open — the tree is visible.
 */
export declare function openMenu(s: Surface, anchor: FlowBox, items: MenuItem[], side?: PopupSide, menuWidth?: number): Popup;
//# sourceMappingURL=surface.d.ts.map