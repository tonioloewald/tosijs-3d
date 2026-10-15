import{Le,Ie}from"./site-6y4h1fn8.js";import{ot,ht}from"./site-qc8zcsj4.js";import{i}from"./site-1yf4ncc8.js";var o="colorPixelShader",r=`#if defined(VERTEXCOLOR) || defined(INSTANCESCOLOR) && defined(INSTANCES)
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
}`;if(!i.ShadersStore[o])i.ShadersStore[o]=r;var n=[Le,ot,Ie,ht];for(let e of n)if(!i.IncludesShadersStore[e.name])i.IncludesShadersStore[e.name]=e.shader;var MC={name:o,shader:r};
export{MC};

//# debugId=8496D0C16B1BDB3364756E2164756E21
//# sourceMappingURL=site-b1qpch87.js.map
