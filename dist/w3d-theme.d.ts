/** Read a CSS variable's computed value, falling back when absent/headless. */
export declare const cssVar: (name: string, fallback: string) => string;
/**
 * The `--w3d-*` theme, resolved at load. One object so a consumer (or a test)
 * can see the whole palette in one place; individual constants below for the
 * common destructure.
 */
export declare const w3dTheme: {
    readonly fontSize: number;
    readonly fontFamily: string;
    readonly text: string;
    readonly muted: string;
    readonly headingWeight: string;
    readonly textWeight: string;
    readonly panelBg: string;
    readonly buttonBg: string;
    readonly buttonHover: string;
    readonly buttonActive: string;
    readonly track: string;
    readonly accent: string;
    readonly rowBg: string;
    readonly rowHover: string;
};
//# sourceMappingURL=w3d-theme.d.ts.map