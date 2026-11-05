import{Be,Oe}from"./site-82r6bc2x.js";import{at,dt}from"./site-8046enz4.js";import{i}from"./site-1yf4ncc8.js";var o="colorPixelShader",r=`#if defined(VERTEXCOLOR) || defined(INSTANCESCOLOR) && defined(INSTANCES)
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
}`;if(!i.ShadersStore[o])i.ShadersStore[o]=r;var n=[Be,at,Oe,dt];for(let e of n)if(!i.IncludesShadersStore[e.name])i.IncludesShadersStore[e.name]=e.shader;var jC={name:o,shader:r};
export{jC};

//# debugId=439554B1DC0DDA2864756E2164756E21
//# sourceMappingURL=site-r90p9v04.js.map
