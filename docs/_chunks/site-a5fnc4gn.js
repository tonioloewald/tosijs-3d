import{_B as k}from"./site-1q3afg48.js";var q="iblGenerateVoxelMipPixelShader",v=`varying vUV: vec2f;var srcMip: texture_3d<f32>;uniform layerNum: i32;@fragment
fn main(input: FragmentInputs)->FragmentOutputs {var Coords=vec3i(2)*vec3i(vec2i(fragmentInputs.position.xy),uniforms.layerNum);var tex =
(u32(select(0u,1u,textureLoad(srcMip,Coords+vec3i(0,0,0),0).x>0.0f))
<< 0u) |
(u32(select(0u,1u,textureLoad(srcMip,Coords+vec3i(1,0,0),0).x>0.0f))
<< 1u) |
(u32(select(0u,1u,textureLoad(srcMip,Coords+vec3i(0,1,0),0).x>0.0f))
<< 2u) |
(u32(select(0u,1u,textureLoad(srcMip,Coords+vec3i(1,1,0),0).x>0.0f))
<< 3u) |
(u32(select(0u,1u,textureLoad(srcMip,Coords+vec3i(0,0,1),0).x>0.0f))
<< 4u) |
(u32(select(0u,1u,textureLoad(srcMip,Coords+vec3i(1,0,1),0).x>0.0f))
<< 5u) |
(u32(select(0u,1u,textureLoad(srcMip,Coords+vec3i(0,1,1),0).x>0.0f))
<< 6u) |
(u32(select(0u,1u,textureLoad(srcMip,Coords+vec3i(1,1,1),0).x>0.0f))
<< 7u);fragmentOutputs.color=vec4f( f32(tex)/255.0f,0.0f,0.0f,1.0);}`;if(!k.ShadersStoreWGSL[q])k.ShadersStoreWGSL[q]=v;var y={name:q,shader:v};
export{y as xi};

//# debugId=2A20E8AD103850A464756E2164756E21
//# sourceMappingURL=site-a5fnc4gn.js.map
