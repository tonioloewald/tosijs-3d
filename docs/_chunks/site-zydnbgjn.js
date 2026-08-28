import{DD as o}from"./site-53d1aqt6.js";var e="handleVertexShader",i="precision highp float;attribute vec3 position;uniform vec3 positionOffset;uniform mat4 worldViewProjection;uniform float scale;void main(void) {vec4 vPos=vec4((vec3(position)+positionOffset)*scale,1.0);gl_Position=worldViewProjection*vPos;}";if(!o.ShadersStore[e])o.ShadersStore[e]=i;var r={name:e,shader:i};
export{r as dg};

//# debugId=A088F79CE56AA4AA64756E2164756E21
//# sourceMappingURL=site-zydnbgjn.js.map
