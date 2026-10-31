import{tn}from"./site-jxn0kfwe.js";import{Ot}from"./site-zyzyq7m9.js";import{kf}from"../hydrate-j44j00c3.js";import{cr}from"./site-xq0hmgcb.js";import{i}from"./site-1yf4ncc8.js";var o="volumetricLightingRenderVolumeVertexShader",r=`#include<__decl__sceneVertex>
#include<__decl__meshVertex>
attribute vec3 position;varying vec4 vWorldPos;void main(void) {vec4 worldPos=world*vec4(position,1.0);vWorldPos=worldPos;gl_Position=viewProjection*worldPos;}
`;if(!i.ShadersStore[o])i.ShadersStore[o]=r;var t=[tn,Ot,kf,cr];for(let e of t)if(!i.IncludesShadersStore[e.name])i.IncludesShadersStore[e.name]=e.shader;var l={name:o,shader:r};export{l as volumetricLightingRenderVolumeVertexShader};

//# debugId=6ED68E892EFE2A1364756E2164756E21
//# sourceMappingURL=volumetricLightingRenderVolume.vertex-4jvt34kq.js.map
