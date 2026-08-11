import{Bh as z}from"./site-yr354tke.js";import{gA as x}from"./site-1j237ehx.js";import{kA as w}from"./site-8w3m2z52.js";import{EA as q}from"./site-jzahp02c.js";import{FA as v}from"./site-psb0h7wx.js";import{_B as f}from"./site-7jxv124x.js";var k="spritesPixelShader",A=`uniform alphaTest: i32;varying vColor: vec4f;varying vUV: vec2f;var diffuseSamplerSampler: sampler;var diffuseSampler: texture_2d<f32>;
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

//# debugId=F1E872030878ECA664756E2164756E21
//# sourceMappingURL=site-22fqqhz2.js.map
