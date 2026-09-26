import{re}from"./site-k4eckz4x.js";import{ii,ri,wi}from"./site-r81de3a5.js";import{Fi}from"./site-zpat65w3.js";import{ye,Te}from"./site-h1rvyaww.js";import{X}from"./site-vka3s0eg.js";import{at,Ze}from"./site-z38ag2pz.js";import{pi}from"./site-64n1eeg0.js";import{je}from"./site-ybj3mbc4.js";import{Vi}from"../hydrate.js";import{i}from"./site-1yf4ncc8.js";var r="lavaPixelShader",o=`uniform vEyePosition: vec4f;uniform vDiffuseColor: vec4f;varying vPositionW: vec3f;uniform time: f32;uniform speed: f32;uniform movingSpeed: f32;uniform fogColor: vec3f;var noiseTextureSampler: sampler;var noiseTexture: texture_2d<f32>;uniform fogDensity: f32;varying noise: f32;
#ifdef NORMAL
varying vNormalW: vec3f;
#endif
#ifdef VERTEXCOLOR
varying vColor: vec4f;
#endif
#include<helperFunctions>
#include<lightUboDeclaration>[0]
#include<lightUboDeclaration>[1]
#include<lightUboDeclaration>[2]
#include<lightUboDeclaration>[3]
#include<lightsFragmentFunctions>
#include<shadowsFragmentFunctions>
#ifdef DIFFUSE
varying vDiffuseUV: vec2f;var diffuseSamplerSampler: sampler;var diffuseSampler: texture_2d<f32>;uniform vDiffuseInfos: vec2f;
#endif
#include<clipPlaneFragmentDeclaration>
#include<logDepthDeclaration>
#include<fogFragmentDeclaration>
fn random(scale: vec3f,seed: f32)->f32 {return fract(sin(dot(fragmentInputs.position.xyz+seed,scale))*43758.5453+seed);}
#if defined(CLUSTLIGHT_BATCH) && CLUSTLIGHT_BATCH>0
varying vViewDepth: f32;
#endif
#define CUSTOM_FRAGMENT_DEFINITIONS
@fragment
fn main(input: FragmentInputs)->FragmentOutputs {
#define CUSTOM_FRAGMENT_MAIN_BEGIN
#include<clipPlaneFragment>
var viewDirectionW: vec3f=normalize(uniforms.vEyePosition.xyz-fragmentInputs.vPositionW);var baseColor: vec4f= vec4f(1.,1.,1.,1.);var diffuseColor: vec3f=uniforms.vDiffuseColor.rgb;var alpha: f32=uniforms.vDiffuseColor.a;
#ifdef DIFFUSE
var noiseTex: vec4f=textureSample(noiseTexture,noiseTextureSampler,fragmentInputs.vDiffuseUV);var T1: vec2f=fragmentInputs.vDiffuseUV+ vec2f(1.5,-1.5)*uniforms.time*0.02;var T2: vec2f=fragmentInputs.vDiffuseUV+ vec2f(-0.5,2.0)*uniforms.time*0.01*uniforms.speed;T1=vec2f(T1.x+noiseTex.x*2.0,T1.y+noiseTex.y*2.0);T2=vec2f(T2.x-noiseTex.y*0.2-uniforms.time*0.001*uniforms.movingSpeed,T2.y+noiseTex.z*0.2+uniforms.time*0.002*uniforms.movingSpeed);var p: f32=textureSample(noiseTexture,noiseTextureSampler,T1*3.0).a;var lavaColor: vec4f=textureSample(diffuseSampler,diffuseSamplerSampler,T2*4.0);var temp: vec4f=lavaColor*( vec4f(p,p,p,p)*2.)+(lavaColor*lavaColor-0.1);baseColor=temp;var depth: f32=fragmentInputs.position.z*4.0;let LOG2: f32=1.442695;var fogFactor: f32=exp2(-uniforms.fogDensity*uniforms.fogDensity*depth*depth*LOG2);fogFactor=1.0-clamp(fogFactor,0.0,1.0);baseColor=mix(baseColor, vec4f(uniforms.fogColor,baseColor.w), vec4f(fogFactor));diffuseColor=baseColor.rgb;
#ifdef ALPHATEST
if (baseColor.a<0.4) {discard;}
#endif
#include<depthPrePass>
baseColor=vec4f(baseColor.rgb*uniforms.vDiffuseInfos.y,baseColor.a);
#endif
#ifdef VERTEXCOLOR
baseColor=vec4f(baseColor.rgb*fragmentInputs.vColor.rgb,baseColor.a);
#endif
#ifdef NORMAL
var normalW: vec3f=normalize(fragmentInputs.vNormalW);
#else
var normalW: vec3f= vec3f(1.0,1.0,1.0);
#endif
#ifdef UNLIT
var diffuseBase: vec3f= vec3f(1.,1.,1.);
#else
var diffuseBase: vec3f= vec3f(0.,0.,0.);var info: lightingInfo;var shadow: f32=1.;var glossiness: f32=0.;var aggShadow: f32=0.;var numLights: f32=0.;
#include<lightFragment>[0]
#include<lightFragment>[1]
#include<lightFragment>[2]
#include<lightFragment>[3]
#endif
#if defined(VERTEXALPHA) || defined(INSTANCESCOLOR) && defined(INSTANCES)
alpha*=fragmentInputs.vColor.a;
#endif
var finalDiffuse: vec3f=clamp(diffuseBase*diffuseColor,vec3f(0.0),vec3f(1.0))*baseColor.rgb;var color: vec4f= vec4f(finalDiffuse,alpha);
#include<logDepthFragment>
#include<fogFragment>
fragmentOutputs.color=color;
#include<imageProcessingCompatibility>
#define CUSTOM_FRAGMENT_MAIN_END
}
`;if(!i.ShadersStoreWGSL[r])i.ShadersStoreWGSL[r]=o;var f=[re,ii,Fi,ri,ye,X,at,Te,wi,pi,je,Ze,Vi];for(let e of f)if(!i.IncludesShadersStoreWGSL[e.name])i.IncludesShadersStoreWGSL[e.name]=e.shader;var h={name:r,shader:o};export{h as lavaPixelShaderWGSL};

//# debugId=178247D5F0AE41F964756E2164756E21
//# sourceMappingURL=lava.fragment-m3a292qe.js.map
