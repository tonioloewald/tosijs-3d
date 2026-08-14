import{lA as q}from"./site-2zb4ht88.js";import{mA as p}from"./site-mvqptzb8.js";import{_B as f}from"./site-1q3afg48.js";import"./site-cxzb117e.js";var k="volumetricLightingRenderVolumeVertexShader",v=`#include<sceneUboDeclaration>
#include<meshUboDeclaration>
attribute position : vec3f;varying vWorldPos: vec4f;@vertex
fn main(input : VertexInputs)->FragmentInputs {let worldPos=mesh.world*vec4f(vertexInputs.position,1.0);vertexOutputs.vWorldPos=worldPos;vertexOutputs.position=scene.viewProjection*worldPos;}
`;if(!f.ShadersStoreWGSL[k])f.ShadersStoreWGSL[k]=v;var w=[p,q];for(let g of w)if(!f.IncludesShadersStoreWGSL[g.name])f.IncludesShadersStoreWGSL[g.name]=g.shader;var A={name:k,shader:v};export{A as volumetricLightingRenderVolumeVertexShaderWGSL};

//# debugId=94C65A821E70528D64756E2164756E21
//# sourceMappingURL=volumetricLightingRenderVolume.vertex-4am129xg.js.map
