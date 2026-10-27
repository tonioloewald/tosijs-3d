import{Js}from"./site-98nanwbj.js";import{Pt}from"./site-nc27cwdf.js";import{Nf}from"../hydrate-fymfsbgh.js";import{lr}from"./site-pp38rj52.js";import{i}from"./site-1yf4ncc8.js";var o="volumetricLightingRenderVolumeVertexShader",r=`#include<__decl__sceneVertex>
#include<__decl__meshVertex>
attribute vec3 position;varying vec4 vWorldPos;void main(void) {vec4 worldPos=world*vec4(position,1.0);vWorldPos=worldPos;gl_Position=viewProjection*worldPos;}
`;if(!i.ShadersStore[o])i.ShadersStore[o]=r;var t=[Js,Pt,Nf,lr];for(let e of t)if(!i.IncludesShadersStore[e.name])i.IncludesShadersStore[e.name]=e.shader;var l={name:o,shader:r};export{l as volumetricLightingRenderVolumeVertexShader};

//# debugId=9413D090B3A58ACF64756E2164756E21
//# sourceMappingURL=volumetricLightingRenderVolume.vertex-55esx8jq.js.map
