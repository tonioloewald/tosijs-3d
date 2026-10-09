import{we,Re}from"./site-2ak22s8r.js";import{X}from"./site-z6szqkpd.js";import{ot,ht}from"./site-qc8zcsj4.js";import{_n,rd}from"./site-2x7kfbns.js";import{st}from"./site-kt8h6srh.js";import{i}from"./site-1yf4ncc8.js";var e="gaussianSplattingPixelShader",o=`#include<clipPlaneFragmentDeclaration>
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
`;if(!i.ShadersStore[e])i.ShadersStore[e]=o;var n=[we,X,ot,_n,st,ht,rd,Re];for(let a of n)if(!i.IncludesShadersStore[a.name])i.IncludesShadersStore[a.name]=a.shader;var F={name:e,shader:o};export{F as gaussianSplattingPixelShader};

//# debugId=26FCD8CF96E1E11364756E2164756E21
//# sourceMappingURL=gaussianSplatting.fragment-604bedaw.js.map
