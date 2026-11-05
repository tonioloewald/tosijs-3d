/** What kind of control a widget is. */
export type WidgetRole = 'button' | 'toggle' | 'slider' | 'select' | 'textbox' | 'colour' | 'vector' | 'list' | 'option' | 'tabs' | 'toolbar' | 'section' | 'popup' | 'group' | 'label' | 'text' | 'progress' | 'editor';
/** A rectangle: x, y from the top left, in the panel's units (a CSS pixel flat). */
export interface ControlBox {
    x: number;
    y: number;
    w: number;
    h: number;
}
/** What a widget says about itself (`Widget3d.semantics()`). */
export interface WidgetSemantics {
    role: WidgetRole;
    /** The accessible name: its label, tooltip or title. '' for none. */
    name: string;
    /** What it shows now. */
    value?: unknown;
    /** The value as the widget writes it (`17:30`, `45%`), when that differs from the number. */
    valueText?: string;
    /**
     * A slider whose track is not linear in its value (a log scale): where the
     * handle is, 0..1, and how to put it somewhere. Steps along the track are
     * what a hand makes; equal steps of the VALUE are not.
     */
    fraction?: number;
    setFraction?(fraction: number): void;
    /** A select's or a tab strip's choices, by label. */
    options?: string[];
    min?: number;
    max?: number;
    step?: number;
    disabled?: boolean;
    /** A section: whether it is open. */
    open?: boolean;
    /** A text box's hint, used for its name when nothing else names it. */
    placeholder?: string;
    /** Set the value through the widget's own setter, as a hand would. */
    set?(value: unknown): void;
    /** Press it (a button, a section header, a list item). */
    activate?(): void;
    /** Controls inside it (a row, a toolbar, a list). */
    children?: SemanticSource[];
    /**
     * Where it is inside the widget that holds it (a toolbar's button). Without
     * one, a child gets an even share of its parent's box.
     */
    box?: ControlBox;
    /** Its children's boxes, in order, relative to it (an editor's stacked rows). */
    childBoxes?: Array<ControlBox | null>;
}
/** Anything that may describe itself: every `Widget3d`. */
export interface SemanticSource {
    semantics?(): WidgetSemantics;
    /** Present on widgets that take a pointer: unnamed ones are a problem. */
    handle?: unknown;
}
/** One node of a panel's control tree. */
export interface ControlNode {
    role: WidgetRole | 'unknown';
    name: string;
    /** Names from the top, joined by `/`. */
    path: string;
    value?: unknown;
    valueText?: string;
    fraction?: number;
    setFraction?(fraction: number): void;
    options?: string[];
    min?: number;
    max?: number;
    step?: number;
    disabled?: boolean;
    open?: boolean;
    /** Can it be set or pressed? */
    interactive: boolean;
    /** Where it is drawn, in the panel's units, when the panel knows. */
    box?: ControlBox;
    set?(value: unknown): void;
    activate?(): void;
    children?: ControlNode[];
}
/**
 * The control tree of a list of widgets (a panel's rows). Sections own the
 * rows after them, up to the next section; a row of widgets is flattened
 * into its level (it is layout, not meaning) and lends its label to an
 * unnamed control beside it.
 */
export declare function controlTree(widgets: SemanticSource[], prefix?: string, 
/** Where each top-level widget is drawn (a panel's row), when known. */
boxOf?: (w: SemanticSource) => ControlBox | null): ControlNode[];
/** Every node, depth first. */
export declare function walkControls(tree: ControlNode[]): ControlNode[];
/**
 * The control at `path` (names joined by `/`). Refuses, with a reason, a path
 * that names nothing or more than one control: an agent is told, never guessed for.
 */
export declare function findControl(tree: ControlNode[], path: string): {
    node: ControlNode;
} | {
    error: string;
};
/** Interactive controls with no name, and paths shared by more than one control. */
export declare function nameProblems(tree: ControlNode[]): string[];
/**
 * A plain, serialisable copy of a tree (no functions), for a tool's answer.
 * Closed sections list no children; `depth` cuts deeper levels.
 */
export declare function plainControls(tree: ControlNode[], depth?: number): Array<Record<string, unknown>>;
//# sourceMappingURL=widget-semantics.d.ts.map