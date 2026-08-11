import{mz as w}from"./site-2bfnsn9v.js";import{nz as y}from"./site-f9x4gp6z.js";import{oz as x}from"./site-fdg03zpz.js";import{pz as v}from"./site-ex7cky94.js";import{_B as b}from"./site-7jxv124x.js";var q="colorPixelShader",z=`#if defined(VERTEXCOLOR) || defined(INSTANCESCOLOR) && defined(INSTANCES)
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

//# debugId=7270D4F6B669723D64756E2164756E21
//# sourceMappingURL=site-wex6xzxt.js.map
