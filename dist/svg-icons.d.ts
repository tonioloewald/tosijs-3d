import { type ElementPart } from 'tosijs';
import iconData from './icon-data';
export { iconData };
export type { IconStyle } from './icon-name';
type IconMap = Record<string, string>;
/** An SVG icon element creator: call with element parts, get an `<svg>` back. */
export type SvgIconCreator = (...parts: ElementPart[]) => SVGSVGElement;
/**
 * Hand-authored redirects layered on top of the generated set — for aliases the
 * icon generator can't express (a rotated/flipped variant under a different
 * name). They're ordinary redirect entries, so they compose with suffixes just
 * like the generator's own directional redirects, and they survive
 * `bun run icons` (which only rewrites {@link icon-data}).
 */
export declare const iconAliases: IconMap;
/**
 * Build an icon proxy over a specific icon-data map. The default {@link svgIcons}
 * binds this to tosijs-3d's generated set; pass your own map to make an
 * independent proxy (this is also how the tests exercise it with a fixture).
 * `aliases` are merged UNDER the data (real icons win any name clash).
 */
export declare function createSvgIcons(data?: IconMap, aliases?: IconMap): Record<string, SvgIconCreator>;
/** Names of the icons with real artwork (excludes pure redirect entries). */
export declare function iconNames(data?: IconMap): string[];
/**
 * Can this name be drawn?
 *
 * Asks the same resolver the drawing code uses, so it answers for the whole icon
 * LANGUAGE — a plain name, a composed one (`chevron270r`), or a mirror reference
 * (`cornerDownLeft`, stored as `cornerDownRight0f`) all answer honestly.
 *
 * Exists because the alternative is guessing: checking `name in iconData` says
 * no for every composed name, and inspecting the stored value says no for every
 * mirror. Both were doing exactly that here, and both were wrong once mirrors
 * started resolving.
 */
export declare function iconExists(name: string): boolean;
export declare function iconGlyph(name: string, opts?: {
    color?: string;
    size?: number;
    x?: number;
    y?: number;
    strokeWidth?: number;
}): SVGGElement;
/** The default icon proxy, over tosijs-3d's generated icon set. */
export declare const svgIcons: Record<string, SvgIconCreator>;
//# sourceMappingURL=svg-icons.d.ts.map