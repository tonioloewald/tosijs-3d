/** Read a CSS variable's computed value, falling back when absent/headless. */
export declare const cssVar: (name: string, fallback: string) => string;
/**
 * The `--w3d-*` theme, resolved at load. One object so a consumer (or a test)
 * can see the whole palette in one place; individual constants below for the
 * common destructure.
 */
export declare const w3dTheme: {
    fontSize: number;
    fontFamily: string;
    text: string;
    muted: string;
    headingWeight: string;
    textWeight: string;
    panelBg: string;
    buttonBg: string;
    buttonHover: string;
    buttonActive: string;
    /**
     * Label colour while a clickable is HELD or selected.
     *
     * Separate from `text` because the background under it has changed: a theme
     * whose `buttonActive` is a strong accent needs a light label on it, and one
     * whose active state is a subtle tint needs the ordinary text colour. Baking
     * that choice into `text` would force every label in the panel to follow a
     * decision that is only about buttons.
     */
    buttonActiveText: string;
    track: string;
    accent: string;
    rowBg: string;
    rowHover: string;
    info: string;
    warning: string;
    error: string;
    focus: string;
    selectedBg: string;
    disabledBg: string;
    disabledText: string;
    strokeWidth: number;
    /**
     * Padding INSIDE a control — what makes a button or a field feel roomy or
     * cramped. Distinct from `spacing`, which is the gap BETWEEN them: a dense
     * inspector wants small padding and comfortable spacing, and a touch UI
     * usually wants the opposite, so one number cannot serve both.
     *
     * Row height derives from it (with `fontSize` and `lineHeight`), so raising
     * it makes controls taller as well as wider — which is what "more spacious"
     * means and what a single width-only padding fails to deliver.
     */
    padding: number;
    roundedRadius: number;
    spacing: number;
    lineHeight: number;
    codeFontFamily: string;
    codeFontWeight: string;
    overlay: string;
    divider: string;
    /** Placeholder and caret — the two field colours that were literals. */
    placeholder: string;
    caret: string;
};
export type W3dTheme = typeof w3dTheme;
/**
 * **Override the theme at runtime.**
 *
 * The `--w3d-*` variables are read ONCE at load, and deliberately so: an SVG
 * destined to be rasterised onto a texture is serialised away from the
 * document, where `var(--w3d-text)` resolves against nothing and paints black.
 * Baking literals is what makes the same widget work in the DOM and in a scene.
 *
 * The cost of that is no live cascade — restyling the page after load changes
 * nothing. This is the way back in, and it is what a theme editor (or the demo
 * below) needs.
 *
 * **Widgets read the theme when they are BUILT**, so existing ones do not
 * repaint. Rebuild them after calling this. That is a real constraint rather
 * than an oversight: a widget that re-read its colours every frame would have
 * to re-resolve them per rasterised texture too, which is the cost this design
 * exists to avoid.
 */
export declare function setW3dTheme(partial: Partial<W3dTheme>): void;
/**
 * **Build something under a different theme**, then put the old one back.
 *
 * The theme is global — one table, read by every widget — and that is usually
 * what you want: a palette exists so a UI looks like one UI. But an inspector
 * beside a toolbar, a warning panel, or a preview of a theme you are editing
 * all want to differ from their surroundings without becoming a second design
 * system.
 *
 * This works because of the property that makes the global table safe in the
 * first place: **a widget reads the theme when it is BUILT.** So a scope is
 * just "set, build, restore" — no plumbing through every widget, no second
 * table, and a widget built inside keeps its colours forever after, because
 * they were baked into its attributes.
 *
 * ```js
 * // `setW3dTheme` is the DEFAULT; this is the override for one panel.
 * const warning = withTheme({ panelBg: '#6b2323', text: '#ffd7d7' }, () =>
 *   panel3d({ width: 300 }, label3d({ text: 'Careful' })))
 * ```
 *
 * **Why this rather than `panel3d({ theme })`.** A panel's children are
 * constructed as ARGUMENTS, so they are already built by the time the panel
 * function runs — an option on the panel could only re-colour the panel's own
 * background while its contents kept the default, which is worse than not
 * offering it. Wrapping the construction puts the children inside the scope,
 * because that is when they evaluate.
 *
 * The unit that gets its own palette is therefore a panel, not a widget: you
 * theme a thing you build, and a panel is the thing you build.
 *
 * **Synchronous only, and deliberately not enforced.** `build` must not await:
 * the restore happens when it returns, so an async build would leak its theme
 * into whatever ran next. Enforcing that would mean rejecting a function that
 * merely returns a promise for an unrelated reason, and the honest constraint
 * is "build synchronously", which is what widget construction already is.
 *
 * Only the keys you override are saved and restored, so nested scopes compose
 * and an unrelated `setW3dTheme` from elsewhere is not clobbered on the way
 * out.
 */
export declare function withTheme<T>(partial: Partial<W3dTheme>, build: () => T): T;
//# sourceMappingURL=w3d-theme.d.ts.map