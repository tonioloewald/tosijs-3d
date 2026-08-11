import{Vg as z}from"./site-4zz4js8h.js";import{_B as f}from"./site-7jxv124x.js";var q="boundingBoxRendererFragmentDeclaration",w=`uniform vec4 color;
`;if(!f.IncludesShadersStore[q])f.IncludesShadersStore[q]=w;var y={name:q,shader:w};var v="boundingBoxRendererPixelShader",A=`#include<__decl__boundingBoxRendererFragment>
#define CUSTOM_FRAGMENT_DEFINITIONS
void main(void) {
#define CUSTOM_FRAGMENT_MAIN_BEGIN
gl_FragColor=color;
#define CUSTOM_FRAGMENT_MAIN_END
}`;if(!f.ShadersStore[v])f.ShadersStore[v]=A;var C=[y,z];for(let k of C)if(!f.IncludesShadersStore[k.name])f.IncludesShadersStore[k.name]=k.shader;var N={name:v,shader:A};
export{N as Ug};

//# debugId=0D58A6C956DCB31E64756E2164756E21
//# sourceMappingURL=site-s4a4hgee.js.map
