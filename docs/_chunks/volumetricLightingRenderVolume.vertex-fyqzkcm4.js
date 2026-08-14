import{Zj as w}from"./site-z6fef8eh.js";import{_j as v}from"./site-pz8hk1a4.js";import{Xy as q}from"./site-cgnh4nqy.js";import{Yy as p}from"./site-vsp6hkzp.js";import{_B as f}from"./site-1q3afg48.js";import"./site-cxzb117e.js";var k="volumetricLightingRenderVolumeVertexShader",y=`#include<__decl__sceneVertex>
#include<__decl__meshVertex>
attribute vec3 position;varying vec4 vWorldPos;void main(void) {vec4 worldPos=world*vec4(position,1.0);vWorldPos=worldPos;gl_Position=viewProjection*worldPos;}
`;if(!f.ShadersStore[k])f.ShadersStore[k]=y;var z=[v,p,w,q];for(let g of z)if(!f.IncludesShadersStore[g.name])f.IncludesShadersStore[g.name]=g.shader;var G={name:k,shader:y};export{G as volumetricLightingRenderVolumeVertexShader};

//# debugId=987A27C45F4A543D64756E2164756E21
//# sourceMappingURL=volumetricLightingRenderVolume.vertex-fyqzkcm4.js.map
