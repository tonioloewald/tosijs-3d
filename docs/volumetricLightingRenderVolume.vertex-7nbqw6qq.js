import{Zj as w}from"./site-0yy388gf.js";import{_j as v}from"./site-1mc2p6p5.js";import{Xy as q}from"./site-eay31fke.js";import{Yy as p}from"./site-ggwxysr4.js";import{_B as f}from"./site-7jxv124x.js";import"./site-68gwymhw.js";var k="volumetricLightingRenderVolumeVertexShader",y=`#include<__decl__sceneVertex>
#include<__decl__meshVertex>
attribute vec3 position;varying vec4 vWorldPos;void main(void) {vec4 worldPos=world*vec4(position,1.0);vWorldPos=worldPos;gl_Position=viewProjection*worldPos;}
`;if(!f.ShadersStore[k])f.ShadersStore[k]=y;var z=[v,p,w,q];for(let g of z)if(!f.IncludesShadersStore[g.name])f.IncludesShadersStore[g.name]=g.shader;var G={name:k,shader:y};export{G as volumetricLightingRenderVolumeVertexShader};

//# debugId=EE4CF1D4A20E9B6164756E2164756E21
//# sourceMappingURL=volumetricLightingRenderVolume.vertex-7nbqw6qq.js.map
