import{AA as d}from"./site-gczq6jz1.js";import{BA as i}from"./site-gk9v6jt8.js";import{CA as a}from"./site-akv2qr8m.js";import{DA as n}from"./site-yzj5pcwj.js";import{FD as e}from"./site-vrsvvb55.js";var r="colorPixelShader",l=`#if defined(VERTEXCOLOR) || defined(INSTANCESCOLOR) && defined(INSTANCES)
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
export{C as zA};

//# debugId=619BE540124D6C7D64756E2164756E21
//# sourceMappingURL=site-7sebcshx.js.map
