import{Ry as x}from"./site-29567zt9.js";import{Zy as w}from"./site-7fsb8rv3.js";import{oz as v}from"./site-yh10kg8k.js";import{pz as q}from"./site-b7qcx2vd.js";import{_B as b}from"./site-1q3afg48.js";var k="outlinePixelShader",y=`#ifdef LOGARITHMICDEPTH
#extension GL_EXT_frag_depth : enable
#endif
uniform vec4 color;
#ifdef ALPHATEST
varying vec2 vUV;uniform sampler2D diffuseSampler;
#endif
#include<clipPlaneFragmentDeclaration>
#include<logDepthDeclaration>
#define CUSTOM_FRAGMENT_DEFINITIONS
void main(void) {
#define CUSTOM_FRAGMENT_MAIN_BEGIN
#include<clipPlaneFragment>
#ifdef ALPHATEST
if (texture2D(diffuseSampler,vUV).a<0.4)
discard;
#endif
#include<logDepthFragment>
gl_FragColor=color;
#define CUSTOM_FRAGMENT_MAIN_END
}`;if(!b.ShadersStore[k])b.ShadersStore[k]=y;var z=[q,w,v,x];for(let f of z)if(!b.IncludesShadersStore[f.name])b.IncludesShadersStore[f.name]=f.shader;var H={name:k,shader:y};
export{H as Dg};

//# debugId=FB8E39647EFE555864756E2164756E21
//# sourceMappingURL=site-hd21fxhy.js.map
