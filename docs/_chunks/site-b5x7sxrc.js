import{Tz as t}from"./site-wmwpetg4.js";import{Uz as a}from"./site-zqq9zg2d.js";import{AA as o}from"./site-mtwqybh7.js";import{BA as n}from"./site-ja5kdh4m.js";import{DD as e}from"./site-53d1aqt6.js";var i="outlinePixelShader",l=`#ifdef LOGARITHMICDEPTH
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
}`;if(!e.ShadersStore[i])e.ShadersStore[i]=l;var d=[n,a,o,t];for(let r of d)if(!e.IncludesShadersStore[r.name])e.IncludesShadersStore[r.name]=r.shader;var p={name:i,shader:l};
export{p as Ig};

//# debugId=313941DC1643F37F64756E2164756E21
//# sourceMappingURL=site-b5x7sxrc.js.map
