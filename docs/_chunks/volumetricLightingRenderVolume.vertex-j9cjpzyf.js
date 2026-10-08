import{Zs}from"./site-dcrmpnyj.js";import{At}from"./site-5fxhqekr.js";import{Fd}from"../hydrate-bxrr95z2.js";import{ar}from"./site-a245ke58.js";import{i}from"./site-1yf4ncc8.js";var o="volumetricLightingRenderVolumeVertexShader",r=`#include<__decl__sceneVertex>
#include<__decl__meshVertex>
attribute vec3 position;varying vec4 vWorldPos;void main(void) {vec4 worldPos=world*vec4(position,1.0);vWorldPos=worldPos;gl_Position=viewProjection*worldPos;}
`;if(!i.ShadersStore[o])i.ShadersStore[o]=r;var t=[Zs,At,Fd,ar];for(let e of t)if(!i.IncludesShadersStore[e.name])i.IncludesShadersStore[e.name]=e.shader;var l={name:o,shader:r};export{l as volumetricLightingRenderVolumeVertexShader};

//# debugId=04EB3C4E8E82975664756E2164756E21
//# sourceMappingURL=volumetricLightingRenderVolume.vertex-j9cjpzyf.js.map
