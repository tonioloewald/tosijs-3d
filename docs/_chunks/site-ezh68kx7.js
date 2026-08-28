import{Yi as a,Zi as c}from"./site-rwcp2t9c.js";import{ok as n}from"./site-yqes9c3t.js";import{Nz as t}from"./site-apq8y78s.js";import{DD as e}from"./site-53d1aqt6.js";var i="iblDominantDirectionPixelShader",o=`#include<helperFunctions>
#include<importanceSampling>
#include<pbrBRDFFunctions>
#include<hdrFilteringFunctions>
var icdfSamplerSampler: sampler;var icdfSampler: texture_2d<f32>;@fragment
fn main(input: FragmentInputs)->FragmentOutputs {var lightDir: vec3f=vec3f(0.0,0.0,0.0);for(var i: u32=0u; i<NUM_SAMPLES; i++)
{var Xi: vec2f=hammersley(i,NUM_SAMPLES);var T: vec2f;T.x=textureSampleLevel(icdfSampler,icdfSamplerSampler,vec2(Xi.x,0.0),0.0).x;T.y=textureSampleLevel(icdfSampler,icdfSamplerSampler,vec2(T.x,Xi.y),0.0).y;var Ls: vec3f=uv_to_normal(vec2f(1.0-fract(T.x+0.25),T.y));lightDir+=Ls;}
lightDir/=vec3f(f32(NUM_SAMPLES));fragmentOutputs.color=vec4f(lightDir,1.0);}`;if(!e.ShadersStoreWGSL[i])e.ShadersStoreWGSL[i]=o;var S=[t,a,n,c];for(let r of S)if(!e.IncludesShadersStoreWGSL[r.name])e.IncludesShadersStoreWGSL[r.name]=r.shader;var d={name:i,shader:o};
export{d as ki};

//# debugId=2E4AB78A704D2A7B64756E2164756E21
//# sourceMappingURL=site-ezh68kx7.js.map
