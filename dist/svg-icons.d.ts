import { type ElementPart } from 'tosijs';
import iconData from './icon-data.js';
export { iconData };
export type { IconStyle } from './icon-name.js';
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
 * Add icons a consumer owns, so the widgets can resolve them by name.
 *
 * ```js
 * registerIcons({
 *   sceneZone: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>',
 *   sceneMarker: 'mapPin',   // a REDIRECT: an alias for an icon that exists
 * })
 * iconGrid3d({ items: [{ icon: 'sceneZone', label: 'zone' }] })
 * ```
 *
 * A value starting with `<` is artwork; anything else is a redirect to another
 * name, which is how the built-in mirrors work and how you alias one of ours to
 * a name from your own vocabulary.
 *
 * **Registering over an existing name replaces it**, deliberately and without a
 * warning: swapping our `camera` for one that matches your art is a reasonable
 * thing to want, and a warning on a deliberate act is noise. Nothing is
 * removed, so a name you did not register still resolves.
 *
 * Values are TRIMMED, because `icon-data` stores every entry with a trailing
 * space and a redirect is re-parsed as a name where that space is fatal — it
 * silently broke every mirrored icon once already (#54).
 */
export declare function registerIcons(icons: IconMap): void;
/** Is this a name a consumer registered, rather than one we shipped? */
export declare function isRegisteredIcon(name: string): boolean;
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