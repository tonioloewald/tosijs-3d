import{Oy as t}from"./site-s6qzsvbs.js";import{_B as e}from"./site-ea0e8ybd.js";var i="pickingPixelShader",f=`#if defined(INSTANCES)
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
`;if(!e.ShadersStoreWGSL[i])e.ShadersStoreWGSL[i]=f;var r=[t];for(let n of r)if(!e.IncludesShadersStoreWGSL[n.name])e.IncludesShadersStoreWGSL[n.name]=n.shader;var o={name:i,shader:f};
export{o as pw};

//# debugId=81DBBBA9ED2CE58164756E2164756E21
//# sourceMappingURL=site-0qg1k8pn.js.map
