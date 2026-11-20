import { type Mount } from './hand-socket.js';
export type HoldClass = 'pistol' | 'rifle' | 'heavy' | 'melee1h' | 'melee2h' | 'pole' | 'bow' | 'shield' | 'wrist';
export interface HoldGrip {
    x: number;
    y: number;
    z: number;
    rx: number;
    ry: number;
    rz: number;
    scale: number;
}
/** Each class's default grip. */
export declare const HOLD_GRIPS: Record<HoldClass, HoldGrip>;
/** Where a class rides: in the hand, or on the forearm (a shield, a watch). */
export declare function holdPlace(c: HoldClass): Mount;
/** Where class `c` rides for a character whose adjustments are `kept` (`place:<class>`), else its own place. */
export declare function placeIn(name: string, kept?: Record<string, unknown>, classes?: Record<string, HoldClass>): Mount;
/** A place's own starting grip, for a class worn somewhere not its own: upright in the fist; along the forearm. */
export declare const PLACE_GRIPS: Record<Mount, HoldGrip>;
/** Where `name`'s adjustment for `place` is kept: its class, or `<place>:<class>` when that is not the class's own place. */
export declare function gripKey(name: string, place?: Mount, classes?: Record<string, HoldClass>): string;
/**
 * The side a class goes on unless told, and the side its grip is SET for:
 * the right, but a bow's left hand and a shield's or a watch's left forearm.
 */
export declare function holdSide(c: HoldClass): 'r' | 'l';
/**
 * What a thing rides on: a hand or a forearm's anatomical socket (made from
 * the arm, calibrated so that on UAL it is the bone itself), or a bone's own
 * frame (the spine, for what is on the back).
 */
export interface HoldMount {
    /** UAL's bone name. */
    bone: 'hand_r' | 'hand_l' | 'lowerarm_r' | 'lowerarm_l' | 'spine_03';
    /** `socket`: the arm's anatomical socket; `bone`: the bone's own frame. */
    frame: 'socket' | 'bone';
    /** For a socket: the hand's or the forearm's. */
    mount?: Mount;
    side?: 'r' | 'l';
}
/** Where class `c` rides on `side` (default its own, `holdSide`), in `place` (default its own). */
export declare function holdMount(c: HoldClass, side?: 'r' | 'l', place?: Mount): HoldMount;
/** Labels for a panel. */
export declare const HOLD_CLASS_LABELS: Record<HoldClass, string>;
/** Tonio's weapon library (`tonio/weapons-classic`), by class. */
export declare const HOLD_CLASSES: Record<string, HoldClass>;
/** An item's class: from `classes` (default Tonio's library), else `pistol`. */
export declare function holdClassOf(name: string, classes?: Record<string, HoldClass>): HoldClass;
/**
 * STOWED: where a thing rides when it is put away on the back, across the
 * shoulders (a rifle, a two-handed sword, a quiver, a slung shield), in the
 * upper spine's frame. One per class, like a grip; a character keeps its
 * adjustments under `stow:<class>` beside its grips.
 */
export declare const STOW_MOUNT: HoldMount;
export declare const STOW_GRIPS: Record<HoldClass, HoldGrip>;
/** Where `name` rides stowed on the back: its class's default with `adjusted['stow:' + class]` over it. */
export declare function stowGrip(name: string, adjusted?: Partial<Record<string, Partial<HoldGrip>>>, classes?: Record<string, HoldClass>): HoldGrip;
/**
 * Where the hand (or forearm) holds `name`: its class's default with
 * `adjusted[class]` laid over it (the adjustments a character keeps, one per
 * class), both set for the class's own side; on the other `side` it is
 * mirrored.
 */
export declare function holdGrip(name: string, adjusted?: Partial<Record<string, Partial<HoldGrip>>>, classes?: Record<string, HoldClass>, side?: 'r' | 'l', place?: Mount): HoldGrip;
/**
 * A grip set on `side` as the class's own side keeps it (what to store when
 * a grip is adjusted on the other side).
 */
export declare function ownSideGrip(name: string, g: HoldGrip, side: 'r' | 'l', classes?: Record<string, HoldClass>, place?: Mount): HoldGrip;
//# sourceMappingURL=hold-grip.d.ts.map