import{mz as w}from"./site-2db1xmdt.js";import{nz as y}from"./site-rfcgcv9w.js";import{oz as x}from"./site-yh10kg8k.js";import{pz as v}from"./site-b7qcx2vd.js";import{_B as b}from"./site-1q3afg48.js";var q="colorPixelShader",z=`#if defined(VERTEXCOLOR) || defined(INSTANCESCOLOR) && defined(INSTANCES)
#define VERTEXCOLOR
varying vec4 vColor;
#else
uniform vec4 color;
#endif
#include<clipPlaneFragmentDeclaration>
#include<fogFragmentDeclaration>
#define CUSTOM_FRAGMENT_DEFINITIONS
void main(void) {
#define CUSTOM_FRAGMENT_MAIN_BEGIN
#include<clipPlaneFragment>
#if defined(VERTEXCOLOR) || defined(INSTANCESCOLOR) && defined(INSTANCES)
gl_FragColor=vColor;
#else
gl_FragColor=color;
#endif
#include<fogFragment>(color,gl_FragColor)
#define CUSTOM_FRAGMENT_MAIN_END
}`;if(!b.ShadersStore[q])b.ShadersStore[q]=z;var A=[v,w,x,y];for(let k of A)if(!b.IncludesShadersStore[k.name])b.IncludesShadersStore[k.name]=k.shader;var J={name:q,shader:z};
export{J as lz};

//# debugId=C22A217AAFB7D6B964756E2164756E21
//# sourceMappingURL=site-w7xnmbr5.js.map
