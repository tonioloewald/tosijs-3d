import{en}from"./site-e7n1xg82.js";import{wt}from"./site-969swdre.js";import{Uf}from"../hydrate-9knhx6yx.js";import{ur}from"./site-p7mzq5ey.js";import{i}from"./site-1yf4ncc8.js";var o="volumetricLightingRenderVolumeVertexShader",r=`#include<__decl__sceneVertex>
#include<__decl__meshVertex>
attribute vec3 position;varying vec4 vWorldPos;void main(void) {vec4 worldPos=world*vec4(position,1.0);vWorldPos=worldPos;gl_Position=viewProjection*worldPos;}
`;if(!i.ShadersStore[o])i.ShadersStore[o]=r;var t=[en,wt,Uf,ur];for(let e of t)if(!i.IncludesShadersStore[e.name])i.IncludesShadersStore[e.name]=e.shader;var l={name:o,shader:r};export{l as volumetricLightingRenderVolumeVertexShader};

//# debugId=96EE34DB80A0758A64756E2164756E21
//# sourceMappingURL=volumetricLightingRenderVolume.vertex-g9vxp00t.js.map
