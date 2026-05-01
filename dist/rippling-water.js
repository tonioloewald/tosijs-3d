import { ShaderMaterial, Vector2, Color4 } from '@babylonjs/core';
export function createRipplingWaterShader(name, scene, options = {}) {
    const { size = 1, waveSpeed1 = 0.5, waveSpeed2 = 0.7, waveHeight1 = 0.1, waveHeight2 = 0.08, waveDirection1 = new Vector2(1, 0), waveDirection2 = new Vector2(0.7, 0.7), baseColor = '#005070', } = options;
    const vertexShader = `
    #version 300 es
    precision highp float;

    uniform mat4 worldViewProjection;
    uniform float time;
    uniform float waveSpeed1;
    uniform float waveSpeed2;
    uniform float waveHeight1;
    uniform float waveHeight2;
    uniform vec2 waveDirection1;
    uniform vec2 waveDirection2;
    uniform float size;

    in vec3 position;
    in vec2 uv;

    out vec2 vUV;

    void main() {
      vUV = uv * size;

      // Calculate the displacement from the first sine wave
      float wave1 = sin(dot(vUV, waveDirection1) * waveSpeed1 + time) * waveHeight1;

      // Calculate the displacement from the second sine wave
      float wave2 = sin(dot(vUV, waveDirection2) * waveSpeed2 + time * 1.2) * waveHeight2; // Slightly different speed for interference

      // Combine the displacements
      vec3 displacedPosition = position + vec3(0.0, wave1 + wave2, 0.0);

      gl_Position = worldViewProjection * vec4(displacedPosition, 1.0);
    }
  `;
    const fragmentShader = `
    #version 300 es
    precision highp float;

    uniform vec4 baseColor;

    in vec2 vUV;
    out vec4 fragColor;

    void main() {
      fragColor = baseColor;
    }
  `;
    const shaderMaterial = new ShaderMaterial(name, scene, {
        vertexSource: vertexShader,
        fragmentSource: fragmentShader,
    }, {
        uniforms: [
            'worldViewProjection',
            'time',
            'waveSpeed1',
            'waveSpeed2',
            'waveHeight1',
            'waveHeight2',
            'waveDirection1',
            'waveDirection2',
            'size',
            'baseColor',
        ],
    });
    shaderMaterial.backFaceCulling = false; // Ensure the water surface is visible from both sides
    // Set initial uniform values
    shaderMaterial.setFloat('size', size);
    shaderMaterial.setFloat('waveSpeed1', waveSpeed1);
    shaderMaterial.setFloat('waveSpeed2', waveSpeed2);
    shaderMaterial.setFloat('waveHeight1', waveHeight1);
    shaderMaterial.setFloat('waveHeight2', waveHeight2);
    shaderMaterial.setVector2('waveDirection1', waveDirection1.normalize());
    shaderMaterial.setVector2('waveDirection2', waveDirection2.normalize());
    console.log(Color4.FromHexString(baseColor), baseColor);
    shaderMaterial.setColor4('baseColor', Color4.FromHexString(baseColor));
    // Time uniform for animation
    let time = 0;
    scene.registerBeforeRender(() => {
        time += scene.getEngine().getDeltaTime() * 0.001;
        shaderMaterial.setFloat('time', time);
    });
    return shaderMaterial;
}
//# sourceMappingURL=rippling-water.js.map