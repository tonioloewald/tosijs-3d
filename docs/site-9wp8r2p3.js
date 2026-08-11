import{Ry as x}from"./site-5mec8xk8.js";import{Zy as w}from"./site-vnstybdd.js";import{oz as v}from"./site-fdg03zpz.js";import{pz as q}from"./site-ex7cky94.js";import{_B as b}from"./site-7jxv124x.js";var k="linePixelShader",y=`#include<clipPlaneFragmentDeclaration>
uniform vec4 color;
#ifdef LOGARITHMICDEPTH
#extension GL_EXT_frag_depth : enable
#endif
#include<logDepthDeclaration>
#define CUSTOM_FRAGMENT_DEFINITIONS
void main(void) {
#define CUSTOM_FRAGMENT_MAIN_BEGIN
#include<logDepthFragment>
#include<clipPlaneFragment>
gl_FragColor=color;
#define CUSTOM_FRAGMENT_MAIN_END
}`;if(!b.ShadersStore[k])b.ShadersStore[k]=y;var z=[q,w,x,v];for(let f of z)if(!b.IncludesShadersStore[f.name])b.IncludesShadersStore[f.name]=f.shader;var H={name:k,shader:y};
export{H as Zg};

//# debugId=37DFF2B99C6E1CD964756E2164756E21
//# sourceMappingURL=site-9wp8r2p3.js.map
