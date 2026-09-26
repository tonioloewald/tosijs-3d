import{ye,Te}from"./site-h1rvyaww.js";import{X}from"./site-vka3s0eg.js";import{at,Ze}from"./site-z38ag2pz.js";import{wi}from"./site-r81de3a5.js";import{je}from"./site-ybj3mbc4.js";import{Vi}from"../hydrate.js";import{i}from"./site-1yf4ncc8.js";var r="firePixelShader",o=`uniform vEyePosition: vec4f;varying vPositionW: vec3f;
#ifdef VERTEXCOLOR
varying vColor: vec4f;
#endif
#ifdef DIFFUSE
varying vDiffuseUV: vec2f;var diffuseSamplerSampler: sampler;var diffuseSampler: texture_2d<f32>;uniform vDiffuseInfos: vec2f;
#endif
var distortionSamplerSampler: sampler;var distortionSampler: texture_2d<f32>;var opacitySamplerSampler: sampler;var opacitySampler: texture_2d<f32>;
#ifdef DIFFUSE
varying vDistortionCoords1: vec2f;varying vDistortionCoords2: vec2f;varying vDistortionCoords3: vec2f;
#endif
#include<clipPlaneFragmentDeclaration>
#include<logDepthDeclaration>
#include<fogFragmentDeclaration>
fn bx2(x: vec4f)->vec4f
{return vec4f(2.0)*x- vec4f(1.0);}
#define CUSTOM_FRAGMENT_DEFINITIONS
@fragment
fn main(input: FragmentInputs)->FragmentOutputs {
#define CUSTOM_FRAGMENT_MAIN_BEGIN
#include<clipPlaneFragment>
var viewDirectionW: vec3f=normalize(uniforms.vEyePosition.xyz-fragmentInputs.vPositionW);var baseColor: vec4f= vec4f(1.,1.,1.,1.);var alpha: f32=1.0;
#ifdef DIFFUSE
let distortionAmount0: f32=0.092;let distortionAmount1: f32=0.092;let distortionAmount2: f32=0.092;var heightAttenuation: vec2f= vec2f(0.3,0.39);var noise0: vec4f=textureSample(distortionSampler,distortionSamplerSampler,fragmentInputs.vDistortionCoords1);var noise1: vec4f=textureSample(distortionSampler,distortionSamplerSampler,fragmentInputs.vDistortionCoords2);var noise2: vec4f=textureSample(distortionSampler,distortionSamplerSampler,fragmentInputs.vDistortionCoords3);var noiseSum: vec4f=bx2(noise0)*distortionAmount0+bx2(noise1)*distortionAmount1+bx2(noise2)*distortionAmount2;var perturbedBaseCoords: vec4f= vec4f(fragmentInputs.vDiffuseUV,0.0,1.0)+noiseSum*(fragmentInputs.vDiffuseUV.y*heightAttenuation.x+heightAttenuation.y);var opacityColor: vec4f=textureSample(opacitySampler,opacitySamplerSampler,perturbedBaseCoords.xy);
#ifdef ALPHATEST
if (opacityColor.r<0.1) {discard;}
#endif
#include<depthPrePass>
baseColor=textureSample(diffuseSampler,diffuseSamplerSampler,perturbedBaseCoords.xy)*2.0;baseColor=baseColor*opacityColor;baseColor=vec4f(baseColor.rgb*uniforms.vDiffuseInfos.y,baseColor.a);
#endif
#ifdef VERTEXCOLOR
baseColor=vec4f(baseColor.rgb*fragmentInputs.vColor.rgb,baseColor.a);
#endif
var diffuseBase: vec3f= vec3f(1.0,1.0,1.0);
#if defined(VERTEXALPHA) || defined(INSTANCESCOLOR) && defined(INSTANCES)
alpha*=fragmentInputs.vColor.a;
#endif
var color: vec4f= vec4f(baseColor.rgb,alpha);
#include<logDepthFragment>
#include<fogFragment>
fragmentOutputs.color=color;
#include<imageProcessingCompatibility>
#define CUSTOM_FRAGMENT_MAIN_END
}
`;if(!i.ShadersStoreWGSL[r])i.ShadersStoreWGSL[r]=o;var t=[ye,X,at,Te,wi,je,Ze,Vi];for(let e of t)if(!i.IncludesShadersStoreWGSL[e.name])i.IncludesShadersStoreWGSL[e.name]=e.shader;var c={name:r,shader:o};export{c as firePixelShaderWGSL};

//# debugId=5BF4F574CDE5083864756E2164756E21
//# sourceMappingURL=fire.fragment-xdhnsdrp.js.map
