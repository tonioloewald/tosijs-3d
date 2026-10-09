import{Se,ye}from"./site-fsaq32k4.js";import{Kr,Jr}from"./site-s5e56hts.js";import{H}from"./site-n8nnc3kp.js";import{se}from"./site-dfwrtqtn.js";import{rt,Ze}from"./site-02ymevb0.js";import{je}from"./site-ybj3mbc4.js";import{i}from"./site-1yf4ncc8.js";var r="gpuRenderParticlesPixelShader",o=`var diffuseSamplerSampler: sampler;var diffuseSampler: texture_2d<f32>;varying vUV: vec2f;varying vColor: vec4f;
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
`;if(!i.ShadersStoreWGSL[r])i.ShadersStoreWGSL[r]=o;var a=[Se,Kr,H,se,Jr,rt,ye,je,Ze];for(let e of a)if(!i.IncludesShadersStoreWGSL[e.name])i.IncludesShadersStoreWGSL[e.name]=e.shader;var u={name:r,shader:o};export{u as gpuRenderParticlesPixelShaderWGSL};

//# debugId=14FBCE62AC8D519164756E2164756E21
//# sourceMappingURL=gpuRenderParticles.fragment-8zaghz4q.js.map
