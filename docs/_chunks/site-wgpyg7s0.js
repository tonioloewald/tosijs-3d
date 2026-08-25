import{sj as o,tj as a}from"./site-2cgvq9cc.js";import{tk as t}from"./site-y0eah2a0.js";import{jA as i}from"./site-t4ayqvvy.js";import{_B as r}from"./site-ea0e8ybd.js";var n="hdrFilteringPixelShader",u=`#include<helperFunctions>
#include<importanceSampling>
#include<pbrBRDFFunctions>
#include<hdrFilteringFunctions>
uniform alphaG: f32;var inputTextureSampler: sampler;var inputTexture: texture_cube<f32>;uniform vFilteringInfo: vec2f;uniform hdrScale: f32;varying direction: vec3f;@fragment
fn main(input: FragmentInputs)->FragmentOutputs {var color: vec3f=radiance(uniforms.alphaG,inputTexture,inputTextureSampler,input.direction,uniforms.vFilteringInfo);fragmentOutputs.color= vec4f(color*uniforms.hdrScale,1.0);}`;if(!r.ShadersStoreWGSL[n])r.ShadersStoreWGSL[n]=u;var c=[i,o,t,a];for(let e of c)if(!r.IncludesShadersStoreWGSL[e.name])r.IncludesShadersStoreWGSL[e.name]=e.shader;var S={name:n,shader:u};
export{S as Gh};

//# debugId=B37704419C277F9964756E2164756E21
//# sourceMappingURL=site-wgpyg7s0.js.map
