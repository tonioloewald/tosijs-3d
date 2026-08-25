import{jA as t}from"./site-t4ayqvvy.js";import{_B as e}from"./site-ea0e8ybd.js";var o="copyTextureToTexturePixelShader",n=`uniform conversion: f32;
#ifndef NO_SAMPLER
var textureSamplerSampler: sampler;
#endif
var textureSampler: texture_2d<f32>;uniform lodLevel : f32;varying vUV: vec2f;
#include<helperFunctions>
@fragment
fn main(input: FragmentInputs)->FragmentOutputs {
#ifdef NO_SAMPLER
var color: vec4f=textureLoad(textureSampler,vec2u(fragmentInputs.position.xy),u32(uniforms.lodLevel));
#else
var color: vec4f=textureSampleLevel(textureSampler,textureSamplerSampler,input.vUV,uniforms.lodLevel);
#endif
#ifdef DEPTH_TEXTURE
fragmentOutputs.fragDepth=color.r;
#else
if (uniforms.conversion==1.) {color=toLinearSpaceVec4(color);} else if (uniforms.conversion==2.) {color=toGammaSpace(color);}
fragmentOutputs.color=color;
#endif
}
`;if(!e.ShadersStoreWGSL[o])e.ShadersStoreWGSL[o]=n;var a=[t];for(let r of a)if(!e.IncludesShadersStoreWGSL[r.name])e.IncludesShadersStoreWGSL[r.name]=r.shader;var f={name:o,shader:n};
export{f as Xm};

//# debugId=190A8C3A58A8B5B464756E2164756E21
//# sourceMappingURL=site-nckphsm4.js.map
