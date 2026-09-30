import{Ks}from"./site-d3ws3k26.js";import{Rt}from"./site-sdr5y55w.js";import{Ld}from"../hydrate.js";import{ar}from"./site-a245ke58.js";import{i}from"./site-1yf4ncc8.js";var o="volumetricLightingRenderVolumeVertexShader",r=`#include<__decl__sceneVertex>
#include<__decl__meshVertex>
attribute vec3 position;varying vec4 vWorldPos;void main(void) {vec4 worldPos=world*vec4(position,1.0);vWorldPos=worldPos;gl_Position=viewProjection*worldPos;}
`;if(!i.ShadersStore[o])i.ShadersStore[o]=r;var t=[Ks,Rt,Ld,ar];for(let e of t)if(!i.IncludesShadersStore[e.name])i.IncludesShadersStore[e.name]=e.shader;var l={name:o,shader:r};export{l as volumetricLightingRenderVolumeVertexShader};

//# debugId=5F96DC556E7C1C9064756E2164756E21
//# sourceMappingURL=volumetricLightingRenderVolume.vertex-sqet71am.js.map
