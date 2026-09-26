import{i}from"./site-1yf4ncc8.js";var o="handleVertexShader",e="precision highp float;attribute vec3 position;uniform vec3 positionOffset;uniform mat4 worldViewProjection;uniform float scale;void main(void) {vec4 vPos=vec4((vec3(position)+positionOffset)*scale,1.0);gl_Position=worldViewProjection*vPos;}";if(!i.ShadersStore[o])i.ShadersStore[o]=e;var NO={name:o,shader:e};
export{NO};

//# debugId=7772DEAB0056A16964756E2164756E21
//# sourceMappingURL=site-j4s24kwm.js.map
