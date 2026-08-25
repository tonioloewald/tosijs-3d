import{Vg as i}from"./site-ctf31wdz.js";import{_B as e}from"./site-ea0e8ybd.js";var o="boundingBoxRendererFragmentDeclaration",d=`uniform vec4 color;
`;if(!e.IncludesShadersStore[o])e.IncludesShadersStore[o]=d;var a={name:o,shader:d};var n="boundingBoxRendererPixelShader",t=`#include<__decl__boundingBoxRendererFragment>
#define CUSTOM_FRAGMENT_DEFINITIONS
void main(void) {
#define CUSTOM_FRAGMENT_MAIN_BEGIN
gl_FragColor=color;
#define CUSTOM_FRAGMENT_MAIN_END
}`;if(!e.ShadersStore[n])e.ShadersStore[n]=t;var c=[a,i];for(let r of c)if(!e.IncludesShadersStore[r.name])e.IncludesShadersStore[r.name]=r.shader;var f={name:n,shader:t};
export{f as Ug};

//# debugId=62DEF74E5322291E64756E2164756E21
//# sourceMappingURL=site-1479640h.js.map
