import{Py as B}from"./site-fstw05em.js";import{Qy as A}from"./site-hgrba224.js";import{Ry as z}from"./site-29567zt9.js";import{Zy as y}from"./site-7fsb8rv3.js";import{mz as v}from"./site-2db1xmdt.js";import{nz as x}from"./site-rfcgcv9w.js";import{oz as w}from"./site-yh10kg8k.js";import{pz as q}from"./site-b7qcx2vd.js";import{_B as b}from"./site-1q3afg48.js";import"./site-cxzb117e.js";var k="gaussianSplattingPixelShader",C=`#include<clipPlaneFragmentDeclaration>
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
`;if(!b.ShadersStore[k])b.ShadersStore[k]=C;var E=[q,y,v,A,z,x,B,w];for(let j of E)if(!b.IncludesShadersStore[j.name])b.IncludesShadersStore[j.name]=j.shader;var P={name:k,shader:C};export{P as gaussianSplattingPixelShader};

//# debugId=BBA089D0A32F642764756E2164756E21
//# sourceMappingURL=gaussianSplatting.fragment-d8whg3pf.js.map
