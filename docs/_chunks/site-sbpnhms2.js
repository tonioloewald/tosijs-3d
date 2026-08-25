import{Ry as t}from"./site-f6yefxyf.js";import{Zy as a}from"./site-kcwst0gf.js";import{oz as o}from"./site-anrhqzyz.js";import{pz as n}from"./site-rk7my3pn.js";import{_B as e}from"./site-ea0e8ybd.js";var i="outlinePixelShader",l=`#ifdef LOGARITHMICDEPTH
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
export{p as Dg};

//# debugId=3AC0F786A93B3C3864756E2164756E21
//# sourceMappingURL=site-sbpnhms2.js.map
