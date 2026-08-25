import{Ry as l}from"./site-f6yefxyf.js";import{Zy as a}from"./site-kcwst0gf.js";import{oz as i}from"./site-anrhqzyz.js";import{pz as o}from"./site-rk7my3pn.js";import{_B as e}from"./site-ea0e8ybd.js";var n="linePixelShader",t=`#include<clipPlaneFragmentDeclaration>
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
export{s as Zg};

//# debugId=8D88FDF243664D4964756E2164756E21
//# sourceMappingURL=site-7dpkdchk.js.map
