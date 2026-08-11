import{Ry as x}from"./site-5mec8xk8.js";import{Zy as w}from"./site-vnstybdd.js";import{oz as v}from"./site-fdg03zpz.js";import{pz as q}from"./site-ex7cky94.js";import{_B as b}from"./site-7jxv124x.js";var k="outlinePixelShader",y=`#ifdef LOGARITHMICDEPTH
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

//# debugId=F278B0B3864917E464756E2164756E21
//# sourceMappingURL=site-21tk3n3a.js.map
