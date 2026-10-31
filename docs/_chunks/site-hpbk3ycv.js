import{Te,Ce}from"./site-5red3kgf.js";import{st,Ke}from"./site-k22r8w0h.js";import{i}from"./site-1yf4ncc8.js";var n="colorPixelShader",r=`#if defined(VERTEXCOLOR) || defined(INSTANCESCOLOR) && defined(INSTANCES)
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
}`;if(!i.ShadersStoreWGSL[n])i.ShadersStoreWGSL[n]=r;var o=[Te,st,Ce,Ke];for(let e of o)if(!i.IncludesShadersStoreWGSL[e.name])i.IncludesShadersStoreWGSL[e.name]=e.shader;var iA={name:n,shader:r};
export{iA};

//# debugId=670E8A49D6D71AEA64756E2164756E21
//# sourceMappingURL=site-hpbk3ycv.js.map
