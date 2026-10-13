import{De,Re}from"./site-eer2fvvn.js";import{ot,ht}from"./site-qc8zcsj4.js";import{i}from"./site-1yf4ncc8.js";var o="colorPixelShader",r=`#if defined(VERTEXCOLOR) || defined(INSTANCESCOLOR) && defined(INSTANCES)
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
}`;if(!i.ShadersStore[o])i.ShadersStore[o]=r;var n=[De,ot,Re,ht];for(let e of n)if(!i.IncludesShadersStore[e.name])i.IncludesShadersStore[e.name]=e.shader;var BC={name:o,shader:r};
export{BC};

//# debugId=12F31DC3F8B7456364756E2164756E21
//# sourceMappingURL=site-3s1ns0gp.js.map
