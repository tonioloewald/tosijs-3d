import{Rz as f}from"./site-x9vxg16m.js";import{Sz as c}from"./site-1n06q2g1.js";import{Tz as g}from"./site-wmwpetg4.js";import{Uz as l}from"./site-zqq9zg2d.js";import{yA as t}from"./site-drqg20zy.js";import{zA as r}from"./site-ejkzt0hp.js";import{AA as i}from"./site-mtwqybh7.js";import{BA as n}from"./site-ja5kdh4m.js";import{DD as a}from"./site-53d1aqt6.js";import"./site-0m1fh7vm.js";var o="gaussianSplattingPixelShader",d=`#include<clipPlaneFragmentDeclaration>
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

//# debugId=30D20147E5C6769364756E2164756E21
//# sourceMappingURL=gaussianSplatting.fragment-s72zyybk.js.map
