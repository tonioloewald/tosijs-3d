import{$i as a,_i as o}from"./site-6q9hdagb.js";import{qk as t}from"./site-0pf6xjs3.js";import{Pz as i}from"./site-wra029kb.js";import{FD as r}from"./site-vrsvvb55.js";var n="hdrFilteringPixelShader",u=`#include<helperFunctions>
#include<importanceSampling>
#include<pbrBRDFFunctions>
#include<hdrFilteringFunctions>
uniform alphaG: f32;var inputTextureSampler: sampler;var inputTexture: texture_cube<f32>;uniform vFilteringInfo: vec2f;uniform hdrScale: f32;varying direction: vec3f;@fragment
fn main(input: FragmentInputs)->FragmentOutputs {var color: vec3f=radiance(uniforms.alphaG,inputTexture,inputTextureSampler,input.direction,uniforms.vFilteringInfo);fragmentOutputs.color= vec4f(color*uniforms.hdrScale,1.0);}`;if(!r.ShadersStoreWGSL[n])r.ShadersStoreWGSL[n]=u;var c=[i,o,t,a];for(let e of c)if(!r.IncludesShadersStoreWGSL[e.name])r.IncludesShadersStoreWGSL[e.name]=e.shader;var S={name:n,shader:u};
export{S as Oh};

//# debugId=F800C12FE99CC9A364756E2164756E21
//# sourceMappingURL=site-1kdx9bf4.js.map
