import { ShaderMaterial, Scene, Vector2 } from '@babylonjs/core';
interface WaterRippleShaderOptions {
    size?: number;
    waveSpeed1?: number;
    waveSpeed2?: number;
    waveHeight1?: number;
    waveHeight2?: number;
    waveDirection1?: Vector2;
    waveDirection2?: Vector2;
    baseColor?: string;
}
export declare function createRipplingWaterShader(name: string, scene: Scene, options?: WaterRippleShaderOptions): ShaderMaterial;
export {};
//# sourceMappingURL=rippling-water.d.ts.map