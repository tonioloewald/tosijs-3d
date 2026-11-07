export type HoldClass = 'pistol' | 'rifle' | 'heavy' | 'melee1h' | 'melee2h' | 'bow' | 'shield';
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
/** Labels for a panel. */
export declare const HOLD_CLASS_LABELS: Record<HoldClass, string>;
/** Tonio's weapon library (`tonio/weapons-classic`), by class. */
export declare const HOLD_CLASSES: Record<string, HoldClass>;
/** An item's class: from `classes` (default Tonio's library), else `pistol`. */
export declare function holdClassOf(name: string, classes?: Record<string, HoldClass>): HoldClass;
/**
 * Where the hand holds `name`: its class's default with `adjusted[class]`
 * laid over it (the adjustments a character keeps, one per class).
 */
export declare function holdGrip(name: string, adjusted?: Partial<Record<string, Partial<HoldGrip>>>, classes?: Record<string, HoldClass>): HoldGrip;
//# sourceMappingURL=hold-grip.d.ts.map