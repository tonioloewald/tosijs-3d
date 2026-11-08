import type { RigRecipe } from './rig-recipe.js';
import type { HandMode } from './rig-fit.js';
/** Where a mesh's body comes from: a URL or a file, and the node to take. */
export interface CharacterSource {
    url?: string;
    file?: File;
    pick?: string;
    /** Its rig, when none is saved for it: hand-placed markers, say. */
    recipe?: Partial<RigRecipe>;
}
/**
 * A rig placed by hand in the rig tool, as a body's default: the five front
 * markers on the left (chin, groin, wrist, elbow, knee; mirrored to the
 * right) and any joints moved by hand, also on the left and mirrored, and
 * any on the centre line (a neck) as they are; `hands` how much hand is
 * rigged (a glove is a mitten: its thumb and middle finger are enough).
 */
export declare function rigFromMarkers([chin, groin, wrist, elbow, knee]: Array<[number, number]>, joints?: Record<string, [number, number, number]>, centre?: Record<string, [number, number, number]>, hands?: HandMode): Partial<RigRecipe>;
/**
 * Tonio's AI-generated characters (CC0, `tonio/ai` on the asset CDN): one
 * mesh each, unrigged, rigged from markers placed by hand where a recipe is
 * given here, else guessed off their outline.
 */
export declare const AI_CHARACTER_SOURCES: Record<string, CharacterSource>;
/** The bodies a character can have besides MakeHuman's. */
export declare const CHARACTER_SOURCES: Record<string, CharacterSource>;
//# sourceMappingURL=character-sources.d.ts.map