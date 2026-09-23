import{Lz as t}from"./site-v2y5x6nj.js";import{FD as e}from"./site-vrsvvb55.js";var i="pickingPixelShader",f=`#if defined(INSTANCES)
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
export{o as _x};

//# debugId=F69E517B446F79C864756E2164756E21
//# sourceMappingURL=site-47k4m59b.js.map
