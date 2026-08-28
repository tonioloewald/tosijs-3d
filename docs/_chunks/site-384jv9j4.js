import{Yi as o,Zi as c}from"./site-rwcp2t9c.js";import{ok as t}from"./site-yqes9c3t.js";import{Nz as n}from"./site-apq8y78s.js";import{DD as e}from"./site-53d1aqt6.js";var i="hdrIrradianceFilteringPixelShader",a=`#include<helperFunctions>
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
export{S as zh};

//# debugId=5FC5930D43026BB964756E2164756E21
//# sourceMappingURL=site-384jv9j4.js.map
