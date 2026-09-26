import{xt}from"./site-23zackra.js";import{Di}from"./site-v7w00mev.js";import{i}from"./site-1yf4ncc8.js";var o="volumetricLightingRenderVolumeVertexShader",r=`#include<sceneUboDeclaration>
#include<meshUboDeclaration>
attribute position : vec3f;varying vWorldPos: vec4f;@vertex
fn main(input : VertexInputs)->FragmentInputs {let worldPos=mesh.world*vec4f(vertexInputs.position,1.0);vertexOutputs.vWorldPos=worldPos;vertexOutputs.position=scene.viewProjection*worldPos;}
`;if(!i.ShadersStoreWGSL[o])i.ShadersStoreWGSL[o]=r;var t=[xt,Di];for(let e of t)if(!i.IncludesShadersStoreWGSL[e.name])i.IncludesShadersStoreWGSL[e.name]=e.shader;var c={name:o,shader:r};export{c as volumetricLightingRenderVolumeVertexShaderWGSL};

//# debugId=35E696820132661764756E2164756E21
//# sourceMappingURL=volumetricLightingRenderVolume.vertex-7kep4b7h.js.map
