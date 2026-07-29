import{lA as q}from"./site-5xv9r9ax.js";import{mA as p}from"./site-8j04nt09.js";import{_B as f}from"./site-7jxv124x.js";import"./site-68gwymhw.js";var k="volumetricLightingRenderVolumeVertexShader",v=`#include<sceneUboDeclaration>
#include<meshUboDeclaration>
attribute position : vec3f;varying vWorldPos: vec4f;@vertex
fn main(input : VertexInputs)->FragmentInputs {let worldPos=mesh.world*vec4f(vertexInputs.position,1.0);vertexOutputs.vWorldPos=worldPos;vertexOutputs.position=scene.viewProjection*worldPos;}
`;if(!f.ShadersStoreWGSL[k])f.ShadersStoreWGSL[k]=v;var w=[p,q];for(let g of w)if(!f.IncludesShadersStoreWGSL[g.name])f.IncludesShadersStoreWGSL[g.name]=g.shader;var A={name:k,shader:v};export{A as volumetricLightingRenderVolumeVertexShaderWGSL};

//# debugId=CE04617F6A9C9B3064756E2164756E21
//# sourceMappingURL=volumetricLightingRenderVolume.vertex-m7t99zcf.js.map
