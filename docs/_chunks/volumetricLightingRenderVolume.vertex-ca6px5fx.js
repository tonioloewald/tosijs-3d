import{Zj as s}from"./site-xqbw0ccy.js";import{_j as n}from"./site-0pgrs4f3.js";import{Xy as i}from"./site-eph9mm4n.js";import{Yy as t}from"./site-yygbvmyr.js";import{_B as e}from"./site-ea0e8ybd.js";import"./site-j4xgtd48.js";var r="volumetricLightingRenderVolumeVertexShader",c=`#include<__decl__sceneVertex>
#include<__decl__meshVertex>
attribute vec3 position;varying vec4 vWorldPos;void main(void) {vec4 worldPos=world*vec4(position,1.0);vWorldPos=worldPos;gl_Position=viewProjection*worldPos;}
`;if(!e.ShadersStore[r])e.ShadersStore[r]=c;var d=[n,t,s,i];for(let o of d)if(!e.IncludesShadersStore[o.name])e.IncludesShadersStore[o.name]=o.shader;var S={name:r,shader:c};export{S as volumetricLightingRenderVolumeVertexShader};

//# debugId=27859F87655B5F1B64756E2164756E21
//# sourceMappingURL=volumetricLightingRenderVolume.vertex-ca6px5fx.js.map
