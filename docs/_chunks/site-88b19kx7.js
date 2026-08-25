import{sj as o,tj as c}from"./site-2cgvq9cc.js";import{tk as t}from"./site-y0eah2a0.js";import{jA as n}from"./site-t4ayqvvy.js";import{_B as e}from"./site-ea0e8ybd.js";var i="hdrIrradianceFilteringPixelShader",a=`#include<helperFunctions>
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
export{S as Kh};

//# debugId=6E935421535B0B8964756E2164756E21
//# sourceMappingURL=site-88b19kx7.js.map
