import{mz as i}from"./site-xr0t1fx0.js";import{nz as d}from"./site-npmkqrmh.js";import{oz as a}from"./site-anrhqzyz.js";import{pz as n}from"./site-rk7my3pn.js";import{_B as e}from"./site-ea0e8ybd.js";var r="colorPixelShader",l=`#if defined(VERTEXCOLOR) || defined(INSTANCESCOLOR) && defined(INSTANCES)
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
}`;if(!e.ShadersStore[r])e.ShadersStore[r]=l;var c=[n,i,a,d];for(let o of c)if(!e.IncludesShadersStore[o.name])e.IncludesShadersStore[o.name]=o.shader;var C={name:r,shader:l};
export{C as lz};

//# debugId=0F19A5C5DE0A165664756E2164756E21
//# sourceMappingURL=site-kvx6hf8x.js.map
