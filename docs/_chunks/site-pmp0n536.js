import{Vz as t}from"./site-9e7z0b37.js";import{Wz as a}from"./site-p2z3c7py.js";import{CA as o}from"./site-akv2qr8m.js";import{DA as n}from"./site-yzj5pcwj.js";import{FD as e}from"./site-vrsvvb55.js";var i="outlinePixelShader",l=`#ifdef LOGARITHMICDEPTH
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
export{p as Kg};

//# debugId=C14C9DA678BA076464756E2164756E21
//# sourceMappingURL=site-pmp0n536.js.map
