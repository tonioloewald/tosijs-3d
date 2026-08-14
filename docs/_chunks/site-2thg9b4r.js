import{sj as x,tj as y}from"./site-jb9yaend.js";import{tk as w}from"./site-1w83fgaf.js";import{jA as v}from"./site-0asqx2x4.js";import{_B as f}from"./site-1q3afg48.js";var q="hdrFilteringPixelShader",z=`#include<helperFunctions>
#include<importanceSampling>
#include<pbrBRDFFunctions>
#include<hdrFilteringFunctions>
uniform alphaG: f32;var inputTextureSampler: sampler;var inputTexture: texture_cube<f32>;uniform vFilteringInfo: vec2f;uniform hdrScale: f32;varying direction: vec3f;@fragment
fn main(input: FragmentInputs)->FragmentOutputs {var color: vec3f=radiance(uniforms.alphaG,inputTexture,inputTextureSampler,input.direction,uniforms.vFilteringInfo);fragmentOutputs.color= vec4f(color*uniforms.hdrScale,1.0);}`;if(!f.ShadersStoreWGSL[q])f.ShadersStoreWGSL[q]=z;var A=[v,x,w,y];for(let k of A)if(!f.IncludesShadersStoreWGSL[k.name])f.IncludesShadersStoreWGSL[k.name]=k.shader;var M={name:q,shader:z};
export{M as Gh};

//# debugId=22CCAE771624EA2564756E2164756E21
//# sourceMappingURL=site-2thg9b4r.js.map
