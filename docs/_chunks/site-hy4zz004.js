import{hA as t}from"./site-ccnx75p9.js";import{iA as a}from"./site-jb4tcghj.js";import{jA as i}from"./site-dqtvr7cx.js";import{kA as o}from"./site-cmgd7mz2.js";import{DD as e}from"./site-53d1aqt6.js";var r="colorPixelShader",f=`#if defined(VERTEXCOLOR) || defined(INSTANCESCOLOR) && defined(INSTANCES)
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
export{u as gA};

//# debugId=98D5AE4038E8CD3064756E2164756E21
//# sourceMappingURL=site-hy4zz004.js.map
