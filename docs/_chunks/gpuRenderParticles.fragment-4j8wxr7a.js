import{Te,Ce}from"./site-5red3kgf.js";import{is,rs}from"./site-fvmmt67p.js";import{Y}from"./site-7zyg1thv.js";import{se}from"./site-dfwrtqtn.js";import{st,Ke}from"./site-k22r8w0h.js";import{Qe}from"./site-me8s7je1.js";import{i}from"./site-1yf4ncc8.js";var r="gpuRenderParticlesPixelShader",o=`var diffuseSamplerSampler: sampler;var diffuseSampler: texture_2d<f32>;varying vUV: vec2f;varying vColor: vec4f;
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
`;if(!i.ShadersStoreWGSL[r])i.ShadersStoreWGSL[r]=o;var a=[Te,is,Y,se,rs,st,Ce,Qe,Ke];for(let e of a)if(!i.IncludesShadersStoreWGSL[e.name])i.IncludesShadersStoreWGSL[e.name]=e.shader;var u={name:r,shader:o};export{u as gpuRenderParticlesPixelShaderWGSL};

//# debugId=BC007C33720D011064756E2164756E21
//# sourceMappingURL=gpuRenderParticles.fragment-4j8wxr7a.js.map
