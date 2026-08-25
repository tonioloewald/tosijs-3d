import{lA as n}from"./site-8w53hv8c.js";import{mA as t}from"./site-1nn7frmg.js";import{_B as e}from"./site-ea0e8ybd.js";import"./site-j4xgtd48.js";var r="volumetricLightingRenderVolumeVertexShader",s=`#include<sceneUboDeclaration>
#include<meshUboDeclaration>
attribute position : vec3f;varying vWorldPos: vec4f;@vertex
fn main(input : VertexInputs)->FragmentInputs {let worldPos=mesh.world*vec4f(vertexInputs.position,1.0);vertexOutputs.vWorldPos=worldPos;vertexOutputs.position=scene.viewProjection*worldPos;}
`;if(!e.ShadersStoreWGSL[r])e.ShadersStoreWGSL[r]=s;var i=[t,n];for(let o of i)if(!e.IncludesShadersStoreWGSL[o.name])e.IncludesShadersStoreWGSL[o.name]=o.shader;var l={name:r,shader:s};export{l as volumetricLightingRenderVolumeVertexShaderWGSL};

//# debugId=45281C2EAC3DEFF864756E2164756E21
//# sourceMappingURL=volumetricLightingRenderVolume.vertex-4msf0vqe.js.map
