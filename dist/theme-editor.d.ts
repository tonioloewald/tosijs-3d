import { type W3dTheme } from './w3d-theme.js';
/**
 * Generic families first — they always resolve, whatever the platform — then
 * faces that ship on both macOS and Windows.
 *
 * Every chain ends in a generic on purpose: "installed on both" is a weaker
 * promise than it sounds even across OS versions, and elsewhere it is no
 * promise at all. A chain ending in `serif` degrades to something readable
 * rather than to whatever the browser happens to pick.
 */
export declare const FONT_STACKS: string[];
export interface ThemeEditorOptions {
    /** Heading above the grid. Pass `''` for none. */
    title?: string;
    /** Fired after each change, so you can rebuild whatever you are showing. */
    handleChange?: (theme: W3dTheme) => void;
    /** @deprecated use `handleChange` — removed in 0.9. */
    onChange?: (theme: W3dTheme) => void;
    /**
     * Colour control factory. Defaults to `<input type="color">`, which **cannot
     * express alpha** — pass tosijs-ui's `colorInput` (or any alpha-capable
     * control) when you have one.
     */
    colorInput?: (config: {
        value: string;
        /** Passed so an injected control can match the editor's row height. */
        height?: string;
        /** Called with the new colour — or with a DOM event, which is unwrapped for you. */
        onChange: (value: string | Event) => void;
    }) => HTMLElement;
    /** Restrict to a subset of tokens. Defaults to everything live. */
    colours?: Array<keyof W3dTheme>;
    metrics?: Array<[keyof W3dTheme, number, number, number]>;
}
/**
 * Build the editor. Returns a plain element — put it wherever you like.
 *
 * The grid is two columns (label, control) so the controls line up down the
 * page; a list of `label: control` pairs at natural width does not, and a
 * palette you are comparing values across is exactly where that shows.
 */
export declare function themeEditor(config?: ThemeEditorOptions): HTMLElement;
//# sourceMappingURL=theme-editor.d.ts.map