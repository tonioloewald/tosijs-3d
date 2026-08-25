import{Eh as l}from"./site-mb72han0.js";import{Ry as f}from"./site-f6yefxyf.js";import{Zy as t}from"./site-kcwst0gf.js";import{mz as i}from"./site-xr0t1fx0.js";import{nz as a}from"./site-npmkqrmh.js";import{_B as e}from"./site-ea0e8ybd.js";var o="spritesPixelShader",n=`#ifdef LOGARITHMICDEPTH
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
}`;if(!e.ShadersStore[o])e.ShadersStore[o]=n;var s=[i,t,f,a,l];for(let r of s)if(!e.IncludesShadersStore[r.name])e.IncludesShadersStore[r.name]=r.shader;var g={name:o,shader:n};
export{g as Dh};

//# debugId=733353D934758EF364756E2164756E21
//# sourceMappingURL=site-tcgtx2wp.js.map
