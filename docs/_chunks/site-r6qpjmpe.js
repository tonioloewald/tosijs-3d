import{Mz as i}from"./site-16yw12h5.js";import{Sz as a}from"./site-qppa82tt.js";import{lA as o}from"./site-3rcgnqcg.js";import{mA as t}from"./site-jjyxr8ne.js";import{FD as e}from"./site-vrsvvb55.js";var r="linePixelShader",l=`#include<clipPlaneFragmentDeclaration>
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
export{s as Pg};

//# debugId=B294A237C7CA475564756E2164756E21
//# sourceMappingURL=site-r6qpjmpe.js.map
