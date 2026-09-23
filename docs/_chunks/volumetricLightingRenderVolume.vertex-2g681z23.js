import{hk as s}from"./site-sbjx7vwe.js";import{ik as n}from"./site-82m4jewt.js";import{Iz as i}from"./site-61a59p2s.js";import{Jz as t}from"./site-k72q68wn.js";import{FD as e}from"./site-vrsvvb55.js";import"./site-jvs5w6sh.js";var r="volumetricLightingRenderVolumeVertexShader",c=`#include<__decl__sceneVertex>
#include<__decl__meshVertex>
attribute vec3 position;varying vec4 vWorldPos;void main(void) {vec4 worldPos=world*vec4(position,1.0);vWorldPos=worldPos;gl_Position=viewProjection*worldPos;}
`;if(!e.ShadersStore[r])e.ShadersStore[r]=c;var d=[n,t,s,i];for(let o of d)if(!e.IncludesShadersStore[o.name])e.IncludesShadersStore[o.name]=o.shader;var S={name:r,shader:c};export{S as volumetricLightingRenderVolumeVertexShader};

//# debugId=9E46BF12F5658B0D64756E2164756E21
//# sourceMappingURL=volumetricLightingRenderVolume.vertex-2g681z23.js.map
