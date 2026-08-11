import{Eh as B}from"./site-ah8hapzy.js";import{Ry as A}from"./site-5mec8xk8.js";import{Zy as z}from"./site-vnstybdd.js";import{mz as w}from"./site-2bfnsn9v.js";import{nz as x}from"./site-f9x4gp6z.js";import{_B as k}from"./site-7jxv124x.js";var v="spritesPixelShader",E=`#ifdef LOGARITHMICDEPTH
#extension GL_EXT_frag_depth : enable
#endif
uniform bool alphaTest;varying vec4 vColor;varying vec2 vUV;uniform sampler2D diffuseSampler;
#include<fogFragmentDeclaration>
#include<logDepthDeclaration>
#define CUSTOM_FRAGMENT_DEFINITIONS
#ifdef PIXEL_PERFECT
vec2 uvPixelPerfect(vec2 uv) {vec2 res=vec2(textureSize(diffuseSampler,0));uv=uv*res;vec2 seam=floor(uv+0.5);uv=seam+clamp((uv-seam)/fwidth(uv),-0.5,0.5);return uv/res;}
#endif
void main(void) {
#define CUSTOM_FRAGMENT_MAIN_BEGIN
#ifdef PIXEL_PERFECT
vec2 uv=uvPixelPerfect(vUV);
#else
vec2 uv=vUV;
#endif
vec4 color=texture2D(diffuseSampler,uv);float fAlphaTest=float(alphaTest);if (fAlphaTest != 0.)
{if (color.a<0.95)
discard;}
color*=vColor;
#include<logDepthFragment>
#include<fogFragment>
gl_FragColor=color;
#include<imageProcessingCompatibility>
#define CUSTOM_FRAGMENT_MAIN_END
}`;if(!k.ShadersStore[v])k.ShadersStore[v]=E;var G=[w,z,A,x,B];for(let q of G)if(!k.IncludesShadersStore[q.name])k.IncludesShadersStore[q.name]=q.shader;var O={name:v,shader:E};
export{O as Dh};

//# debugId=2F235C0F8A62A24264756E2164756E21
//# sourceMappingURL=site-s2wy022p.js.map
