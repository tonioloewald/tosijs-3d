import{_B as o}from"./site-ea0e8ybd.js";var e="handleVertexShader",i="precision highp float;attribute vec3 position;uniform vec3 positionOffset;uniform mat4 worldViewProjection;uniform float scale;void main(void) {vec4 vPos=vec4((vec3(position)+positionOffset)*scale,1.0);gl_Position=worldViewProjection*vPos;}";if(!o.ShadersStore[e])o.ShadersStore[e]=i;var r={name:e,shader:i};
export{r as _f};

//# debugId=2ACB0E31F5778E7B64756E2164756E21
//# sourceMappingURL=site-0s31agqd.js.map
