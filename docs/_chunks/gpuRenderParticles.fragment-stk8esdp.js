import{Ny as s}from"./site-z3rcqrsy.js";import{Oy as m}from"./site-hyqd0dsa.js";import{Mz as f}from"./site-16yw12h5.js";import{Pz as i}from"./site-wra029kb.js";import{Sz as c}from"./site-qppa82tt.js";import{jA as n}from"./site-13g8e62p.js";import{kA as l}from"./site-trx32srv.js";import{lA as t}from"./site-3rcgnqcg.js";import{mA as a}from"./site-jjyxr8ne.js";import{FD as e}from"./site-vrsvvb55.js";import"./site-jvs5w6sh.js";var o="gpuRenderParticlesPixelShader",p=`var diffuseSamplerSampler: sampler;var diffuseSampler: texture_2d<f32>;varying vUV: vec2f;varying vColor: vec4f;
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

//# debugId=A50A1809B6A0F51164756E2164756E21
//# sourceMappingURL=gpuRenderParticles.fragment-stk8esdp.js.map
