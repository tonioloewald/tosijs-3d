import{Vg as z}from"./site-mss3tep3.js";import{_B as f}from"./site-1q3afg48.js";var q="boundingBoxRendererFragmentDeclaration",w=`uniform vec4 color;
`;if(!f.IncludesShadersStore[q])f.IncludesShadersStore[q]=w;var y={name:q,shader:w};var v="boundingBoxRendererPixelShader",A=`#include<__decl__boundingBoxRendererFragment>
#define CUSTOM_FRAGMENT_DEFINITIONS
void main(void) {
#define CUSTOM_FRAGMENT_MAIN_BEGIN
gl_FragColor=color;
#define CUSTOM_FRAGMENT_MAIN_END
}`;if(!f.ShadersStore[v])f.ShadersStore[v]=A;var C=[y,z];for(let k of C)if(!f.IncludesShadersStore[k.name])f.IncludesShadersStore[k.name]=k.shader;var N={name:v,shader:A};
export{N as Ug};

//# debugId=7140B571DDDBB7AC64756E2164756E21
//# sourceMappingURL=site-jeq7d4jm.js.map
