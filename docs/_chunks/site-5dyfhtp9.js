import{Bh as z}from"./site-y8r977x5.js";import{gA as x}from"./site-1w2bjfmq.js";import{kA as w}from"./site-jzegcmyz.js";import{EA as q}from"./site-wy8z6msz.js";import{FA as v}from"./site-h2yr8kje.js";import{_B as f}from"./site-1q3afg48.js";var k="spritesPixelShader",A=`uniform alphaTest: i32;varying vColor: vec4f;varying vUV: vec2f;var diffuseSamplerSampler: sampler;var diffuseSampler: texture_2d<f32>;
#include<fogFragmentDeclaration>
#include<logDepthDeclaration>
#define CUSTOM_FRAGMENT_DEFINITIONS
#ifdef PIXEL_PERFECT
fn uvPixelPerfect(uv: vec2f)->vec2f {var res: vec2f= vec2f(textureDimensions(diffuseSampler,0));var uvTemp=uv*res;var seam: vec2f=floor(uvTemp+0.5);uvTemp=seam+clamp((uvTemp-seam)/fwidth(uvTemp),vec2f(-0.5),vec2f(0.5));return uvTemp/res;}
#endif
@fragment
fn main(input: FragmentInputs)->FragmentOutputs {
#define CUSTOM_FRAGMENT_MAIN_BEGIN
#ifdef PIXEL_PERFECT
var uv: vec2f=uvPixelPerfect(input.vUV);
#else
var uv: vec2f=input.vUV;
#endif
var color: vec4f=textureSample(diffuseSampler,diffuseSamplerSampler,uv);var fAlphaTest: f32= f32(uniforms.alphaTest);if (fAlphaTest != 0.)
{if (color.a<0.95) {discard;}}
color*=input.vColor;
#include<logDepthFragment>
#include<fogFragment>
fragmentOutputs.color=color;
#include<imageProcessingCompatibility>
#define CUSTOM_FRAGMENT_MAIN_END
}`;if(!f.ShadersStoreWGSL[k])f.ShadersStoreWGSL[k]=A;var B=[q,w,x,v,z];for(let j of B)if(!f.IncludesShadersStoreWGSL[j.name])f.IncludesShadersStoreWGSL[j.name]=j.shader;var N={name:k,shader:A};
export{N as Ah};

//# debugId=488F415058809ABB64756E2164756E21
//# sourceMappingURL=site-5dyfhtp9.js.map
