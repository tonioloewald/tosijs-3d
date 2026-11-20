import { type Quat, type Vec3 } from './spatial-transform.js';
export interface TwoBoneTurn {
    /** The upper bone's world turn. */
    first: Quat;
    /** The lower bone's world turn, `first` included. */
    second: Quat;
    /** Where the middle joint goes. */
    mid: Vec3;
    /** Where the end goes: the goal, or as near as the limb reaches. */
    end: Vec3;
}
/** The shortest rotation taking unit vector `a` onto unit vector `b`. */
export declare function rotationBetween(a: Vec3, b: Vec3): Quat;
/**
 * Turn the bones `root`→`mid`→`end` so `end` reaches `goal`, the middle joint
 * bending toward `bend` (any direction off the root-to-goal line). Null when
 * there is nothing to do (already there, a bone of no length, a bend along
 * the line).
 */
export declare function twoBoneIk(root: Vec3, mid: Vec3, end: Vec3, goal: Vec3, bend: Vec3): TwoBoneTurn | null;
//# sourceMappingURL=two-bone-ik.d.ts.map