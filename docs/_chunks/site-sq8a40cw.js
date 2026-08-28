import{Kz as i}from"./site-7yz9j1tz.js";import{Qz as a}from"./site-sskzjsez.js";import{jA as o}from"./site-dqtvr7cx.js";import{kA as t}from"./site-cmgd7mz2.js";import{DD as e}from"./site-53d1aqt6.js";var r="linePixelShader",l=`#include<clipPlaneFragmentDeclaration>
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
export{s as Ng};

//# debugId=7779FD9E68E9709664756E2164756E21
//# sourceMappingURL=site-sq8a40cw.js.map
