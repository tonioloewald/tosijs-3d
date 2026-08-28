import{Ly as s}from"./site-rn3vxmce.js";import{My as m}from"./site-ejyrxdxm.js";import{Kz as f}from"./site-7yz9j1tz.js";import{Nz as i}from"./site-apq8y78s.js";import{Qz as c}from"./site-sskzjsez.js";import{hA as n}from"./site-ccnx75p9.js";import{iA as l}from"./site-jb4tcghj.js";import{jA as t}from"./site-dqtvr7cx.js";import{kA as a}from"./site-cmgd7mz2.js";import{DD as e}from"./site-53d1aqt6.js";import"./site-0m1fh7vm.js";var o="gpuRenderParticlesPixelShader",p=`var diffuseSamplerSampler: sampler;var diffuseSampler: texture_2d<f32>;varying vUV: vec2f;varying vColor: vec4f;
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

//# debugId=1C894DE386DEB35164756E2164756E21
//# sourceMappingURL=gpuRenderParticles.fragment-29vvrt44.js.map
