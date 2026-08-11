import{_B as f}from"./site-7jxv124x.js";var k="handleVertexShader",p="precision highp float;attribute vec3 position;uniform vec3 positionOffset;uniform mat4 worldViewProjection;uniform float scale;void main(void) {vec4 vPos=vec4((vec3(position)+positionOffset)*scale,1.0);gl_Position=worldViewProjection*vPos;}";if(!f.ShadersStore[k])f.ShadersStore[k]=p;var u={name:k,shader:p};
export{u as _f};

//# debugId=2B9C95F219CF65C664756E2164756E21
//# sourceMappingURL=site-yz03wab2.js.map
