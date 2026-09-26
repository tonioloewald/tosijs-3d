import{xe,ve}from"./site-t5na8t3j.js";import{Lr,Fr}from"./site-hsewys6t.js";import{W}from"./site-6bak08eg.js";import{te}from"./site-ybnjbk1z.js";import{tt,Ye}from"./site-m1s81bf3.js";import{We}from"./site-cr62e97z.js";import{i}from"./site-1yf4ncc8.js";var r="gpuRenderParticlesPixelShader",o=`var diffuseSamplerSampler: sampler;var diffuseSampler: texture_2d<f32>;varying vUV: vec2f;varying vColor: vec4f;
#include<clipPlaneFragmentDeclaration>
#include<imageProcessingDeclaration>
#include<logDepthDeclaration>
#include<helperFunctions>
#include<imageProcessingFunctions>
#include<fogFragmentDeclaration>
@fragment
fn main(input: FragmentInputs)->FragmentOutputs {
#include<clipPlaneFragment>
let textureColor: vec4f=textureSample(diffuseSampler,diffuseSamplerSampler,input.vUV);var baseColor: vec4f=textureColor*input.vColor;
#ifdef BLENDMULTIPLYMODE
let alpha: f32=input.vColor.a*textureColor.a;baseColor=vec4f(baseColor.rgb*alpha+vec3f(1.0)*(1.0-alpha),baseColor.a);
#endif
#include<logDepthFragment>
#include<fogFragment>(color,baseColor)
#ifdef IMAGEPROCESSINGPOSTPROCESS
baseColor=vec4f(toLinearSpaceVec3(baseColor.rgb),baseColor.a);
#else
#ifdef IMAGEPROCESSING
baseColor=vec4f(toLinearSpaceVec3(baseColor.rgb),baseColor.a);baseColor=applyImageProcessing(baseColor);
#endif
#endif
fragmentOutputs.color=baseColor;}
`;if(!i.ShadersStoreWGSL[r])i.ShadersStoreWGSL[r]=o;var a=[xe,Lr,W,te,Fr,tt,ve,We,Ye];for(let e of a)if(!i.IncludesShadersStoreWGSL[e.name])i.IncludesShadersStoreWGSL[e.name]=e.shader;var u={name:r,shader:o};export{u as gpuRenderParticlesPixelShaderWGSL};

//# debugId=4DA59CDAD44247AB64756E2164756E21
//# sourceMappingURL=gpuRenderParticles.fragment-cb7zaj58.js.map
