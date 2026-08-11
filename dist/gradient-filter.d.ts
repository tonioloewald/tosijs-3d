export interface GradientFilter {
    evaluate(t: number): number;
}
export interface ControlPoint {
    x: number;
    y: number;
}
export declare class PiecewiseLinearFilter implements GradientFilter {
    points: ControlPoint[];
    constructor(points?: ControlPoint[]);
    private sort;
    evaluate(t: number): number;
    addPoint(x: number, y: number): void;
    removePoint(index: number): void;
    setPoint(index: number, x: number, y: number): void;
}
export declare function identityFilter(): PiecewiseLinearFilter;
export declare function plateauFilter(steps: number): PiecewiseLinearFilter;
//# sourceMappingURL=gradient-filter.d.ts.map