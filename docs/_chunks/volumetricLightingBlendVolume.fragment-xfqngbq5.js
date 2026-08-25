import{_B as e}from"./site-ea0e8ybd.js";import"./site-j4xgtd48.js";var t="volumetricLightingBlendVolumePixelShader",r=`varying vUV: vec2f;var textureSamplerSampler: sampler;var textureSampler: texture_2d<f32>;var depthSampler: texture_2d<f32>;uniform invProjection: mat4x4<f32>;uniform outputTextureSize: vec2f;
#ifdef USE_EXTINCTION
uniform extinction: vec3f;
#endif
#define CUSTOM_FRAGMENT_DEFINITIONS
@fragment
fn main(input: FragmentInputs)->FragmentOutputs {fragmentOutputs.color=textureSample(textureSampler,textureSamplerSampler,input.vUV);
#ifdef USE_EXTINCTION
let depth=textureLoad(depthSampler,vec2u(fragmentInputs.position.xy),0).r;let ndc=vec4f((fragmentInputs.position.xy/uniforms.outputTextureSize)*2.-1.,depth,1.0);var viewPos=uniforms.invProjection*ndc;viewPos=viewPos/viewPos.w;let eyeDist=length(viewPos);fragmentOutputs.color2=vec4f(exp(-uniforms.extinction*eyeDist),1.0);
#endif
}
`;if(!e.ShadersStoreWGSL[t])e.ShadersStoreWGSL[t]=r;var n={name:t,shader:r};export{n as volumetricLightingBlendVolumePixelShaderWGSL};

//# debugId=74B50F52277B378A64756E2164756E21
//# sourceMappingURL=volumetricLightingBlendVolume.fragment-xfqngbq5.js.map
