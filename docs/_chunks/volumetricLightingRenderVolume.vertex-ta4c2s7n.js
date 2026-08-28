import{fk as s}from"./site-kz159q7d.js";import{gk as n}from"./site-kr23qrtj.js";import{Gz as i}from"./site-ht78zrhn.js";import{Hz as t}from"./site-t3aad17c.js";import{DD as e}from"./site-53d1aqt6.js";import"./site-0m1fh7vm.js";var r="volumetricLightingRenderVolumeVertexShader",c=`#include<__decl__sceneVertex>
#include<__decl__meshVertex>
attribute vec3 position;varying vec4 vWorldPos;void main(void) {vec4 worldPos=world*vec4(position,1.0);vWorldPos=worldPos;gl_Position=viewProjection*worldPos;}
`;if(!e.ShadersStore[r])e.ShadersStore[r]=c;var d=[n,t,s,i];for(let o of d)if(!e.IncludesShadersStore[o.name])e.IncludesShadersStore[o.name]=o.shader;var S={name:r,shader:c};export{S as volumetricLightingRenderVolumeVertexShader};

//# debugId=9C323F4C798200DF64756E2164756E21
//# sourceMappingURL=volumetricLightingRenderVolume.vertex-ta4c2s7n.js.map
