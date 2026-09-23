import{Tz as f}from"./site-983q0w01.js";import{Uz as c}from"./site-47ecx3ja.js";import{Vz as g}from"./site-9e7z0b37.js";import{Wz as l}from"./site-p2z3c7py.js";import{AA as t}from"./site-gczq6jz1.js";import{BA as r}from"./site-gk9v6jt8.js";import{CA as i}from"./site-akv2qr8m.js";import{DA as n}from"./site-yzj5pcwj.js";import{FD as a}from"./site-vrsvvb55.js";import"./site-jvs5w6sh.js";var o="gaussianSplattingPixelShader",d=`#include<clipPlaneFragmentDeclaration>
#include<logDepthDeclaration>
#include<fogFragmentDeclaration>
#ifdef GPUPICKER_DEPTH
layout(location=0) out highp vec4 glFragData[2];
#endif
#ifdef GPUPICKER_PACK_DEPTH
#include<packingFunctions>
#endif
varying vec4 vColor;varying vec2 vPosition;
#define CUSTOM_FRAGMENT_DEFINITIONS
#include<gaussianSplattingFragmentDeclaration>
void main () {
#define CUSTOM_FRAGMENT_MAIN_BEGIN
#include<clipPlaneFragment>
vec4 finalColor=gaussianColor(vColor);
#define CUSTOM_FRAGMENT_BEFORE_FRAGCOLOR
#ifdef GPUPICKER_DEPTH
glFragData[0]=finalColor;
#ifdef GPUPICKER_PACK_DEPTH
glFragData[1]=pack(gl_FragCoord.z);
#else
glFragData[1]=vec4(gl_FragCoord.z,0.0,0.0,1.0);
#endif
#else
gl_FragColor=finalColor;
#endif
#define CUSTOM_FRAGMENT_MAIN_END
}
`;if(!a.ShadersStore[o])a.ShadersStore[o]=d;var m=[n,l,r,c,g,t,f,i];for(let e of m)if(!a.IncludesShadersStore[e.name])a.IncludesShadersStore[e.name]=e.shader;var E={name:o,shader:d};export{E as gaussianSplattingPixelShader};

//# debugId=0DA3F7A7448E665364756E2164756E21
//# sourceMappingURL=gaussianSplatting.fragment-t0qwngn2.js.map
