import{EA as t}from"./site-j1mr7gyn.js";import{FA as a}from"./site-kcvb8kks.js";import{GA as i}from"./site-4ghhz517.js";import{HA as o}from"./site-42gdhacc.js";import{_B as e}from"./site-ea0e8ybd.js";var r="colorPixelShader",f=`#if defined(VERTEXCOLOR) || defined(INSTANCESCOLOR) && defined(INSTANCES)
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
}`;if(!e.ShadersStoreWGSL[r])e.ShadersStoreWGSL[r]=f;var d=[o,t,i,a];for(let n of d)if(!e.IncludesShadersStoreWGSL[n.name])e.IncludesShadersStoreWGSL[n.name]=n.shader;var u={name:r,shader:f};
export{u as DA};

//# debugId=2CE4395DFC398CFA64756E2164756E21
//# sourceMappingURL=site-b5aaapq6.js.map
