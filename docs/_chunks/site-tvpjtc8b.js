import{Se,ye}from"./site-fsaq32k4.js";import{rt,Ze}from"./site-02ymevb0.js";import{i}from"./site-1yf4ncc8.js";var n="colorPixelShader",r=`#if defined(VERTEXCOLOR) || defined(INSTANCESCOLOR) && defined(INSTANCES)
#define VERTEXCOLOR
varying vColor: vec4f;
#else
uniform color: vec4f;
#endif
#include<clipPlaneFragmentDeclaration>
#include<fogFragmentDeclaration>
#define CUSTOM_FRAGMENT_DEFINITIONS
@fragment
fn main(input: FragmentInputs)->FragmentOutputs {
#define CUSTOM_FRAGMENT_MAIN_BEGIN
#include<clipPlaneFragment>
#if defined(VERTEXCOLOR) || defined(INSTANCESCOLOR) && defined(INSTANCES)
fragmentOutputs.color=input.vColor;
#else
fragmentOutputs.color=uniforms.color;
#endif
#include<fogFragment>(color,fragmentOutputs.color)
#define CUSTOM_FRAGMENT_MAIN_END
}`;if(!i.ShadersStoreWGSL[n])i.ShadersStoreWGSL[n]=r;var o=[Se,rt,ye,Ze];for(let e of o)if(!i.IncludesShadersStoreWGSL[e.name])i.IncludesShadersStoreWGSL[e.name]=e.shader;var XC={name:n,shader:r};
export{XC};

//# debugId=2DA4367DC473565264756E2164756E21
//# sourceMappingURL=site-tvpjtc8b.js.map
