import{Py as f}from"./site-q5g98pfp.js";import{Qy as c}from"./site-nmrky29w.js";import{Ry as g}from"./site-f6yefxyf.js";import{Zy as l}from"./site-kcwst0gf.js";import{mz as r}from"./site-xr0t1fx0.js";import{nz as t}from"./site-npmkqrmh.js";import{oz as i}from"./site-anrhqzyz.js";import{pz as n}from"./site-rk7my3pn.js";import{_B as a}from"./site-ea0e8ybd.js";import"./site-j4xgtd48.js";var o="gaussianSplattingPixelShader",d=`#include<clipPlaneFragmentDeclaration>
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

//# debugId=31C5150890D18B6A64756E2164756E21
//# sourceMappingURL=gaussianSplatting.fragment-4xe9zkrq.js.map
