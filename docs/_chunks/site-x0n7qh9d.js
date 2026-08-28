import{Yi as o,Zi as a}from"./site-rwcp2t9c.js";import{ok as t}from"./site-yqes9c3t.js";import{Nz as i}from"./site-apq8y78s.js";import{DD as r}from"./site-53d1aqt6.js";var n="hdrFilteringPixelShader",u=`#include<helperFunctions>
#include<importanceSampling>
#include<pbrBRDFFunctions>
#include<hdrFilteringFunctions>
uniform alphaG: f32;var inputTextureSampler: sampler;var inputTexture: texture_cube<f32>;uniform vFilteringInfo: vec2f;uniform hdrScale: f32;varying direction: vec3f;@fragment
fn main(input: FragmentInputs)->FragmentOutputs {var color: vec3f=radiance(uniforms.alphaG,inputTexture,inputTextureSampler,input.direction,uniforms.vFilteringInfo);fragmentOutputs.color= vec4f(color*uniforms.hdrScale,1.0);}`;if(!r.ShadersStoreWGSL[n])r.ShadersStoreWGSL[n]=u;var c=[i,o,t,a];for(let e of c)if(!r.IncludesShadersStoreWGSL[e.name])r.IncludesShadersStoreWGSL[e.name]=e.shader;var S={name:n,shader:u};
export{S as Mh};

//# debugId=297A6D8CAB12124E64756E2164756E21
//# sourceMappingURL=site-x0n7qh9d.js.map
