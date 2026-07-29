import{Oy as v}from"./site-akkkv5va.js";import{_B as b}from"./site-7jxv124x.js";var q="pickingPixelShader",w=`#if defined(INSTANCES)
flat varying vMeshID: f32;
#else
uniform meshID: f32;
#endif
#ifdef GPUPICKER_PACK_DEPTH
#include<packingFunctions>
#endif
@fragment
fn main(input: FragmentInputs)->FragmentOutputs {var id: i32;
#if defined(INSTANCES)
id=i32(input.vMeshID);
#else
id=i32(uniforms.meshID);
#endif
var color=vec3f(
f32((id>>16) & 0xFF),
f32((id>>8) & 0xFF),
f32(id & 0xFF),
)/255.0;
#ifdef GPUPICKER_DEPTH
fragmentOutputs.fragData0=vec4f(color,1.0);
#ifdef GPUPICKER_PACK_DEPTH
fragmentOutputs.fragData1=pack(fragmentInputs.position.z);
#else
fragmentOutputs.fragData1=vec4f(fragmentInputs.position.z,0.0,0.0,1.0);
#endif
#else
fragmentOutputs.color=vec4f(color,1.0);
#endif
}
`;if(!b.ShadersStoreWGSL[q])b.ShadersStoreWGSL[q]=w;var x=[v];for(let f of x)if(!b.IncludesShadersStoreWGSL[f.name])b.IncludesShadersStoreWGSL[f.name]=f.shader;var A={name:q,shader:w};
export{A as pw};

//# debugId=DB0C6CF726C6B41764756E2164756E21
//# sourceMappingURL=site-zp4yq9b0.js.map
