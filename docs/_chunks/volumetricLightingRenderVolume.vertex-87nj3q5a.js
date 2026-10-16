import{Ks}from"./site-3zzyjv9f.js";import{Rt}from"./site-sdr5y55w.js";import{Nf}from"../hydrate-dejhg2dr.js";import{ar}from"./site-a245ke58.js";import{i}from"./site-1yf4ncc8.js";var o="volumetricLightingRenderVolumeVertexShader",r=`#include<__decl__sceneVertex>
#include<__decl__meshVertex>
attribute vec3 position;varying vec4 vWorldPos;void main(void) {vec4 worldPos=world*vec4(position,1.0);vWorldPos=worldPos;gl_Position=viewProjection*worldPos;}
`;if(!i.ShadersStore[o])i.ShadersStore[o]=r;var t=[Ks,Rt,Nf,ar];for(let e of t)if(!i.IncludesShadersStore[e.name])i.IncludesShadersStore[e.name]=e.shader;var l={name:o,shader:r};export{l as volumetricLightingRenderVolumeVertexShader};

//# debugId=DC862039D23ED53964756E2164756E21
//# sourceMappingURL=volumetricLightingRenderVolume.vertex-87nj3q5a.js.map
