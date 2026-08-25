import{eA as s}from"./site-55fjnmm4.js";import{fA as m}from"./site-s8a42t29.js";import{gA as f}from"./site-p3qvxbqn.js";import{jA as i}from"./site-t4ayqvvy.js";import{kA as c}from"./site-ngcgfsjk.js";import{EA as n}from"./site-j1mr7gyn.js";import{FA as l}from"./site-kcvb8kks.js";import{GA as t}from"./site-4ghhz517.js";import{HA as a}from"./site-42gdhacc.js";import{_B as e}from"./site-ea0e8ybd.js";import"./site-j4xgtd48.js";var o="gpuRenderParticlesPixelShader",p=`var diffuseSamplerSampler: sampler;var diffuseSampler: texture_2d<f32>;varying vUV: vec2f;varying vColor: vec4f;
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
`;if(!e.ShadersStoreWGSL[o])e.ShadersStoreWGSL[o]=p;var S=[a,s,c,i,m,n,t,f,l];for(let r of S)if(!e.IncludesShadersStoreWGSL[r.name])e.IncludesShadersStoreWGSL[r.name]=r.shader;var F={name:o,shader:p};export{F as gpuRenderParticlesPixelShaderWGSL};

//# debugId=E969E5DD24D5C77364756E2164756E21
//# sourceMappingURL=gpuRenderParticles.fragment-65242ykf.js.map
