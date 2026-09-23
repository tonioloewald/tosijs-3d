import{Qz as n}from"./site-w4vz4trq.js";import{Rz as t}from"./site-93bva1mf.js";import{FD as e}from"./site-vrsvvb55.js";import"./site-jvs5w6sh.js";var r="volumetricLightingRenderVolumeVertexShader",s=`#include<sceneUboDeclaration>
#include<meshUboDeclaration>
attribute position : vec3f;varying vWorldPos: vec4f;@vertex
fn main(input : VertexInputs)->FragmentInputs {let worldPos=mesh.world*vec4f(vertexInputs.position,1.0);vertexOutputs.vWorldPos=worldPos;vertexOutputs.position=scene.viewProjection*worldPos;}
`;if(!e.ShadersStoreWGSL[r])e.ShadersStoreWGSL[r]=s;var i=[t,n];for(let o of i)if(!e.IncludesShadersStoreWGSL[o.name])e.IncludesShadersStoreWGSL[o.name]=o.shader;var l={name:r,shader:s};export{l as volumetricLightingRenderVolumeVertexShaderWGSL};

//# debugId=E50681002C31240164756E2164756E21
//# sourceMappingURL=volumetricLightingRenderVolume.vertex-tv6cc662.js.map
