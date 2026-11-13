import{en}from"./site-nend5n25.js";import{wt}from"./site-969swdre.js";import{Wf}from"../hydrate-kpq0k8je.js";import{ur}from"./site-p7mzq5ey.js";import{i}from"./site-1yf4ncc8.js";var o="volumetricLightingRenderVolumeVertexShader",r=`#include<__decl__sceneVertex>
#include<__decl__meshVertex>
attribute vec3 position;varying vec4 vWorldPos;void main(void) {vec4 worldPos=world*vec4(position,1.0);vWorldPos=worldPos;gl_Position=viewProjection*worldPos;}
`;if(!i.ShadersStore[o])i.ShadersStore[o]=r;var t=[en,wt,Wf,ur];for(let e of t)if(!i.IncludesShadersStore[e.name])i.IncludesShadersStore[e.name]=e.shader;var l={name:o,shader:r};export{l as volumetricLightingRenderVolumeVertexShader};

//# debugId=4DBDFF59BA98FD1164756E2164756E21
//# sourceMappingURL=volumetricLightingRenderVolume.vertex-jvq84zw9.js.map
