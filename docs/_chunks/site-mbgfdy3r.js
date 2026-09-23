import{Vz as l}from"./site-9e7z0b37.js";import{Wz as a}from"./site-p2z3c7py.js";import{CA as i}from"./site-akv2qr8m.js";import{DA as o}from"./site-yzj5pcwj.js";import{FD as e}from"./site-vrsvvb55.js";var n="linePixelShader",t=`#include<clipPlaneFragmentDeclaration>
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
export{s as Rg};

//# debugId=678CDC3101FE30E864756E2164756E21
//# sourceMappingURL=site-mbgfdy3r.js.map
