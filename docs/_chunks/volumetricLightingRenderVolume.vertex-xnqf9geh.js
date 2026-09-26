import{Rs}from"./site-8m029sz0.js";import{St}from"./site-qq23efnd.js";import{bf}from"../hydrate.js";import{ji}from"./site-xdbjmd04.js";import{i}from"./site-1yf4ncc8.js";var o="volumetricLightingRenderVolumeVertexShader",r=`#include<__decl__sceneVertex>
#include<__decl__meshVertex>
attribute vec3 position;varying vec4 vWorldPos;void main(void) {vec4 worldPos=world*vec4(position,1.0);vWorldPos=worldPos;gl_Position=viewProjection*worldPos;}
`;if(!i.ShadersStore[o])i.ShadersStore[o]=r;var t=[Rs,St,bf,ji];for(let e of t)if(!i.IncludesShadersStore[e.name])i.IncludesShadersStore[e.name]=e.shader;var l={name:o,shader:r};export{l as volumetricLightingRenderVolumeVertexShader};

//# debugId=C35FF811BDDD9D0264756E2164756E21
//# sourceMappingURL=volumetricLightingRenderVolume.vertex-xnqf9geh.js.map
