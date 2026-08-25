import{gA as i}from"./site-p3qvxbqn.js";import{kA as a}from"./site-ngcgfsjk.js";import{GA as o}from"./site-4ghhz517.js";import{HA as t}from"./site-42gdhacc.js";import{_B as e}from"./site-ea0e8ybd.js";var r="linePixelShader",l=`#include<clipPlaneFragmentDeclaration>
uniform color: vec4f;
#include<logDepthDeclaration>
#define CUSTOM_FRAGMENT_DEFINITIONS
@fragment
fn main(input: FragmentInputs)->FragmentOutputs {
#define CUSTOM_FRAGMENT_MAIN_BEGIN
#include<logDepthFragment>
#include<clipPlaneFragment>
fragmentOutputs.color=uniforms.color;
#define CUSTOM_FRAGMENT_MAIN_END
}`;if(!e.ShadersStoreWGSL[r])e.ShadersStoreWGSL[r]=l;var m=[t,a,i,o];for(let n of m)if(!e.IncludesShadersStoreWGSL[n.name])e.IncludesShadersStoreWGSL[n.name]=n.shader;var s={name:r,shader:l};
export{s as Xg};

//# debugId=015C79EC07530A5A64756E2164756E21
//# sourceMappingURL=site-papfe7qe.js.map
