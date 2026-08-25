import{jl as p}from"./site-kbafn58x.js";import{Oy as o}from"./site-s6qzsvbs.js";import{_B as e}from"./site-ea0e8ybd.js";var t="kernelBlurFragment",l=`#ifdef DOF
factor=sampleCoC(fragmentInputs.sampleCoord{X}); 
computedWeight=KERNEL_WEIGHT{X}*factor;sumOfWeights+=computedWeight;
#else
computedWeight=KERNEL_WEIGHT{X};
#endif
#ifdef PACKEDFLOAT
blend+=unpack(textureSample(textureSampler,textureSamplerSampler,fragmentInputs.sampleCoord{X}))*computedWeight;
#else
blend+=textureSample(textureSampler,textureSamplerSampler,fragmentInputs.sampleCoord{X})*computedWeight;
#endif
`;if(!e.IncludesShadersStoreWGSL[t])e.IncludesShadersStoreWGSL[t]=l;var m={name:t,shader:l};var n="kernelBlurFragment2",f=`#ifdef DOF
factor=sampleCoC(fragmentInputs.sampleCenter+uniforms.delta*KERNEL_DEP_OFFSET{X});computedWeight=KERNEL_DEP_WEIGHT{X}*factor;sumOfWeights+=computedWeight;
#else
computedWeight=KERNEL_DEP_WEIGHT{X};
#endif
#ifdef PACKEDFLOAT
blend+=unpack(textureSample(textureSampler,textureSamplerSampler,fragmentInputs.sampleCenter+uniforms.delta*KERNEL_DEP_OFFSET{X}))*computedWeight;
#else
blend+=textureSample(textureSampler,textureSamplerSampler,fragmentInputs.sampleCenter+uniforms.delta*KERNEL_DEP_OFFSET{X})*computedWeight;
#endif
`;if(!e.IncludesShadersStoreWGSL[n])e.IncludesShadersStoreWGSL[n]=f;var u={name:n,shader:f};var a="kernelBlurPixelShader",i=`var textureSamplerSampler: sampler;var textureSampler: texture_2d<f32>;uniform delta: vec2f;varying sampleCenter: vec2f;
#ifdef DOF
var circleOfConfusionSamplerSampler: sampler;var circleOfConfusionSampler: texture_2d<f32>;fn sampleCoC(offset: vec2f)->f32 {var coc: f32=textureSample(circleOfConfusionSampler,circleOfConfusionSamplerSampler,offset).r;return coc; }
#endif
#include<kernelBlurVaryingDeclaration>[0..varyingCount]
#ifdef PACKEDFLOAT
#include<packingFunctions>
#endif
#define CUSTOM_FRAGMENT_DEFINITIONS
@fragment
fn main(input: FragmentInputs)->FragmentOutputs {var computedWeight: f32=0.0;
#ifdef PACKEDFLOAT
var blend: f32=0.;
#else
var blend: vec4f= vec4f(0.);
#endif
#ifdef DOF
var sumOfWeights: f32=CENTER_WEIGHT; 
var factor: f32=0.0;
#ifdef PACKEDFLOAT
blend+=unpack(textureSample(textureSampler,textureSamplerSampler,input.sampleCenter))*CENTER_WEIGHT;
#else
blend+=textureSample(textureSampler,textureSamplerSampler,input.sampleCenter)*CENTER_WEIGHT;
#endif
#endif
#include<kernelBlurFragment>[0..varyingCount]
#include<kernelBlurFragment2>[0..depCount]
#ifdef PACKEDFLOAT
fragmentOutputs.color=pack(blend);
#else
fragmentOutputs.color=blend;
#endif
#ifdef DOF
fragmentOutputs.color/=sumOfWeights;
#endif
}`;if(!e.ShadersStoreWGSL[a])e.ShadersStoreWGSL[a]=i;var d=[p,o,m,u];for(let r of d)if(!e.IncludesShadersStoreWGSL[r.name])e.IncludesShadersStoreWGSL[r.name]=r.shader;var x={name:a,shader:i};
export{x as hl};

//# debugId=5BEF3056BBF0272B64756E2164756E21
//# sourceMappingURL=site-v23emtx2.js.map
