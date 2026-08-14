import{jl as A}from"./site-8r9x3vkj.js";import{_B as b}from"./site-1q3afg48.js";var q="kernelBlurVertex",w="vertexOutputs.sampleCoord{X}=vertexOutputs.sampleCenter+uniforms.delta*KERNEL_OFFSET{X};";if(!b.IncludesShadersStoreWGSL[q])b.IncludesShadersStoreWGSL[q]=w;var z={name:q,shader:w};var v="kernelBlurVertexShader",C=`attribute position: vec2f;uniform delta: vec2f;varying sampleCenter: vec2f;
#include<kernelBlurVaryingDeclaration>[0..varyingCount]
#define CUSTOM_VERTEX_DEFINITIONS
@vertex
fn main(input : VertexInputs)->FragmentInputs {const madd: vec2f= vec2f(0.5,0.5);
#define CUSTOM_VERTEX_MAIN_BEGIN
vertexOutputs.sampleCenter=(vertexInputs.position*madd+madd);
#include<kernelBlurVertex>[0..varyingCount]
vertexOutputs.position= vec4f(vertexInputs.position,0.0,1.0);
#define CUSTOM_VERTEX_MAIN_END
}`;if(!b.ShadersStoreWGSL[v])b.ShadersStoreWGSL[v]=C;var F=[A,z];for(let f of F)if(!b.IncludesShadersStoreWGSL[f.name])b.IncludesShadersStoreWGSL[f.name]=f.shader;var O={name:v,shader:C};
export{O as il};

//# debugId=88D756487F43E8FC64756E2164756E21
//# sourceMappingURL=site-g4jqchg7.js.map
