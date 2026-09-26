import{xe,ve}from"./site-t5na8t3j.js";import{tt,Ye}from"./site-m1s81bf3.js";import{i}from"./site-1yf4ncc8.js";var n="colorPixelShader",r=`#if defined(VERTEXCOLOR) || defined(INSTANCESCOLOR) && defined(INSTANCES)
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
}`;if(!i.ShadersStoreWGSL[n])i.ShadersStoreWGSL[n]=r;var o=[xe,tt,ve,Ye];for(let e of o)if(!i.IncludesShadersStoreWGSL[e.name])i.IncludesShadersStoreWGSL[e.name]=e.shader;var p0={name:n,shader:r};
export{p0};

//# debugId=933F495A67D7ED0064756E2164756E21
//# sourceMappingURL=site-ta2k7kne.js.map
