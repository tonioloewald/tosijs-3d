import{en}from"./site-sp4hn76m.js";import{Ot}from"./site-zyzyq7m9.js";import{Gf}from"../hydrate-d5cbj3ft.js";import{ur}from"./site-p7mzq5ey.js";import{i}from"./site-1yf4ncc8.js";var o="volumetricLightingRenderVolumeVertexShader",r=`#include<__decl__sceneVertex>
#include<__decl__meshVertex>
attribute vec3 position;varying vec4 vWorldPos;void main(void) {vec4 worldPos=world*vec4(position,1.0);vWorldPos=worldPos;gl_Position=viewProjection*worldPos;}
`;if(!i.ShadersStore[o])i.ShadersStore[o]=r;var t=[en,Ot,Gf,ur];for(let e of t)if(!i.IncludesShadersStore[e.name])i.IncludesShadersStore[e.name]=e.shader;var l={name:o,shader:r};export{l as volumetricLightingRenderVolumeVertexShader};

//# debugId=A5D0141AFF77C34B64756E2164756E21
//# sourceMappingURL=volumetricLightingRenderVolume.vertex-t5brnnca.js.map
