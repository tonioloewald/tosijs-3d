import { Component } from 'tosijs';
import { PiecewiseLinearFilter } from './gradient-filter';
export declare class GradientEditor extends Component {
    static initAttributes: {
        width: number;
        height: number;
    };
    static styleSpec: {
        ':host': {
            display: string;
            position: string;
        };
        ':host canvas': {
            cursor: string;
            borderRadius: string;
            border: string;
        };
    };
    filter: PiecewiseLinearFilter;
    private dragIndex;
    private cnv;
    private ctx;
    content: HTMLCanvasElement[];
    private toCanvasX;
    private toCanvasY;
    private fromCanvasX;
    private fromCanvasY;
    private draw;
    private findPoint;
    private getCanvasCoords;
    private _onMouseDown;
    private _onMouseMove;
    private _onMouseUp;
    private _onDblClick;
    private _onContextMenu;
    private fireChange;
    connectedCallback(): void;
    disconnectedCallback(): void;
    private updateSize;
    render(): void;
}
export declare const gradientEditor: import("tosijs").ElementCreator<GradientEditor>;
//# sourceMappingURL=gradient-editor.d.ts.map