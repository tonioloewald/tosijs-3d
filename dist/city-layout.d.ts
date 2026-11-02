/** A side of a cell: north is +Z, east is +X. */
export type Side = 'n' | 'e' | 's' | 'w';
export type RoadPiece = 'single' | 'end' | 'straight' | 'bend' | 'tee' | 'cross';
export interface RoadCell {
    x: number;
    z: number;
    piece: RoadPiece;
    /** Quarter turns clockwise (north to east) from the piece's canonical orientation. */
    turns: 0 | 1 | 2 | 3;
    /** Which neighbours are road, as a mask: n 1, e 2, s 4, w 8. */
    mask: number;
}
export interface Rect {
    x: number;
    z: number;
    width: number;
    depth: number;
}
export interface Lot extends Rect {
    /** The side that faces the street. */
    front: Side;
    /** A corner lot faces two streets: `front` and `side`. */
    corner: boolean;
    side?: Side;
    /** Index into `blocks`. */
    block: number;
}
export interface CityLayoutOptions {
    width: number;
    depth: number;
    seed?: number;
    blockMin?: number;
    blockMax?: number;
    lotWidth?: [number, number];
    lotDepth?: number;
    ring?: boolean;
}
export interface CityLayout {
    width: number;
    depth: number;
    /** Row-major (`z * width + x`): true where a cell is road. */
    road: boolean[];
    roads: RoadCell[];
    blocks: Rect[];
    lots: Lot[];
    /** What is left in the middle of a block, one per block that has some. */
    yards: (Rect & {
        block: number;
    })[];
}
export declare const SIDE_BIT: Record<Side, number>;
/** A mask turned a quarter clockwise: n becomes e, e becomes s, and so on. */
export declare const turnMask: (mask: number, turns: number) => number;
/** The road piece and its turns for a cell whose road neighbours are `mask`. */
export declare function roadPiece(mask: number): {
    piece: RoadPiece;
    turns: 0 | 1 | 2 | 3;
};
export declare function cityLayout(options: CityLayoutOptions): CityLayout;
//# sourceMappingURL=city-layout.d.ts.map