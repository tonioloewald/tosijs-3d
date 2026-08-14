import{_B as f}from"./site-1q3afg48.js";var k="handleVertexShader",p="precision highp float;attribute vec3 position;uniform vec3 positionOffset;uniform mat4 worldViewProjection;uniform float scale;void main(void) {vec4 vPos=vec4((vec3(position)+positionOffset)*scale,1.0);gl_Position=worldViewProjection*vPos;}";if(!f.ShadersStore[k])f.ShadersStore[k]=p;var u={name:k,shader:p};
export{u as _f};

//# debugId=1EE07A089BC64AFE64756E2164756E21
//# sourceMappingURL=site-trzxzdc4.js.map
