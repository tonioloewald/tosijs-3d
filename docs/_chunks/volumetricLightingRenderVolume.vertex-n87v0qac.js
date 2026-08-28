import{Oz as n}from"./site-pyks27h7.js";import{Pz as t}from"./site-5mpt0yyf.js";import{DD as e}from"./site-53d1aqt6.js";import"./site-0m1fh7vm.js";var r="volumetricLightingRenderVolumeVertexShader",s=`#include<sceneUboDeclaration>
#include<meshUboDeclaration>
attribute position : vec3f;varying vWorldPos: vec4f;@vertex
fn main(input : VertexInputs)->FragmentInputs {let worldPos=mesh.world*vec4f(vertexInputs.position,1.0);vertexOutputs.vWorldPos=worldPos;vertexOutputs.position=scene.viewProjection*worldPos;}
`;if(!e.ShadersStoreWGSL[r])e.ShadersStoreWGSL[r]=s;var i=[t,n];for(let o of i)if(!e.IncludesShadersStoreWGSL[o.name])e.IncludesShadersStoreWGSL[o.name]=o.shader;var l={name:r,shader:s};export{l as volumetricLightingRenderVolumeVertexShaderWGSL};

//# debugId=6A94E6A0A2AFBB9064756E2164756E21
//# sourceMappingURL=volumetricLightingRenderVolume.vertex-n87v0qac.js.map
