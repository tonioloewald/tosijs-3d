import{Ks}from"./site-ptaj8c5q.js";import{It}from"./site-czh58v68.js";import{Nf}from"../hydrate-wfr0jrvj.js";import{lr}from"./site-pp38rj52.js";import{i}from"./site-1yf4ncc8.js";var o="volumetricLightingRenderVolumeVertexShader",r=`#include<__decl__sceneVertex>
#include<__decl__meshVertex>
attribute vec3 position;varying vec4 vWorldPos;void main(void) {vec4 worldPos=world*vec4(position,1.0);vWorldPos=worldPos;gl_Position=viewProjection*worldPos;}
`;if(!i.ShadersStore[o])i.ShadersStore[o]=r;var t=[Ks,It,Nf,lr];for(let e of t)if(!i.IncludesShadersStore[e.name])i.IncludesShadersStore[e.name]=e.shader;var l={name:o,shader:r};export{l as volumetricLightingRenderVolumeVertexShader};

//# debugId=3004398E70FB9A1064756E2164756E21
//# sourceMappingURL=volumetricLightingRenderVolume.vertex-pea72qyg.js.map
