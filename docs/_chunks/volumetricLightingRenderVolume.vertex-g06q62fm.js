import{Zs}from"./site-x1x0tv28.js";import{At}from"./site-5fxhqekr.js";import{Fd}from"../hydrate-avg36r6v.js";import{or}from"./site-j5k9sn7a.js";import{i}from"./site-1yf4ncc8.js";var o="volumetricLightingRenderVolumeVertexShader",r=`#include<__decl__sceneVertex>
#include<__decl__meshVertex>
attribute vec3 position;varying vec4 vWorldPos;void main(void) {vec4 worldPos=world*vec4(position,1.0);vWorldPos=worldPos;gl_Position=viewProjection*worldPos;}
`;if(!i.ShadersStore[o])i.ShadersStore[o]=r;var t=[Zs,At,Fd,or];for(let e of t)if(!i.IncludesShadersStore[e.name])i.IncludesShadersStore[e.name]=e.shader;var l={name:o,shader:r};export{l as volumetricLightingRenderVolumeVertexShader};

//# debugId=1B215455F0B5A8C164756E2164756E21
//# sourceMappingURL=volumetricLightingRenderVolume.vertex-g06q62fm.js.map
