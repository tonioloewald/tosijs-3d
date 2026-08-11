/** A CSS-style bag produced from a suffix chain — assigned onto an SVG's `.style`. */
export interface IconStyle {
    transform?: string;
    transformOrigin?: string;
    opacity?: string;
    fill?: string;
    stroke?: string;
    strokeWidth?: string;
}
export interface ParsedIconName {
    baseName: string;
    style: IconStyle;
}
/**
 * Split a name into its base + the style implied by its trailing suffixes.
 * Returns `null` if there are no suffixes (or nothing before them) — the caller
 * then treats the whole string as a plain icon name.
 */
export declare function parseStyleSuffixes(name: string): ParsedIconName | null;
/**
 * Merge a suffix-derived style into an accumulator (for layered resolution —
 * a redirect target may carry its own suffix, e.g. `arrowUpRight90r`). Transforms
 * concatenate; scalar props are first-writer-wins so the outermost (caller's)
 * suffix takes precedence over an inner redirect's.
 */
export declare function mergeIconStyle(into: IconStyle, add: IconStyle): void;
//# sourceMappingURL=icon-name.d.ts.map