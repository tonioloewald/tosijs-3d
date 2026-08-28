import{yA as d}from"./site-drqg20zy.js";import{zA as i}from"./site-ejkzt0hp.js";import{AA as a}from"./site-mtwqybh7.js";import{BA as n}from"./site-ja5kdh4m.js";import{DD as e}from"./site-53d1aqt6.js";var r="colorPixelShader",l=`#if defined(VERTEXCOLOR) || defined(INSTANCESCOLOR) && defined(INSTANCES)
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
export{C as xA};

//# debugId=2E88CAF020C51F2F64756E2164756E21
//# sourceMappingURL=site-vbjfzyww.js.map
