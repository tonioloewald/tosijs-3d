import{Tz as l}from"./site-wmwpetg4.js";import{Uz as a}from"./site-zqq9zg2d.js";import{AA as i}from"./site-mtwqybh7.js";import{BA as o}from"./site-ja5kdh4m.js";import{DD as e}from"./site-53d1aqt6.js";var n="linePixelShader",t=`#include<clipPlaneFragmentDeclaration>
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
}`;if(!e.ShadersStore[n])e.ShadersStore[n]=t;var c=[o,a,l,i];for(let r of c)if(!e.IncludesShadersStore[r.name])e.IncludesShadersStore[r.name]=r.shader;var s={name:n,shader:t};
export{s as Pg};

//# debugId=99ECDACE9347122C64756E2164756E21
//# sourceMappingURL=site-vw0n0xje.js.map
