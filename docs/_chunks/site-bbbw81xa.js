import{$i as c,_i as o}from"./site-6q9hdagb.js";import{qk as t}from"./site-0pf6xjs3.js";import{Pz as n}from"./site-wra029kb.js";import{FD as e}from"./site-vrsvvb55.js";var i="hdrIrradianceFilteringPixelShader",a=`#include<helperFunctions>
#include<importanceSampling>
#include<pbrBRDFFunctions>
#include<hdrFilteringFunctions>
var inputTextureSampler: sampler;var inputTexture: texture_cube<f32>;
#ifdef IBL_CDF_FILTERING
var icdfTextureSampler: sampler;var icdfTexture: texture_2d<f32>;
#endif
uniform vFilteringInfo: vec2f;uniform hdrScale: f32;varying direction: vec3f;@fragment
fn main(input: FragmentInputs)->FragmentOutputs {var color: vec3f=irradiance(inputTexture,inputTextureSampler,input.direction,uniforms.vFilteringInfo,0.0,vec3f(1.0),input.direction
#ifdef IBL_CDF_FILTERING
,icdfTexture,icdfTextureSampler
#endif
);fragmentOutputs.color= vec4f(color*uniforms.hdrScale,1.0);}`;if(!e.ShadersStoreWGSL[i])e.ShadersStoreWGSL[i]=a;var u=[n,o,t,c];for(let r of u)if(!e.IncludesShadersStoreWGSL[r.name])e.IncludesShadersStoreWGSL[r.name]=r.shader;var S={name:i,shader:a};
export{S as Bh};

//# debugId=87E5954549DDF4B864756E2164756E21
//# sourceMappingURL=site-bbbw81xa.js.map
