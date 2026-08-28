import{DD as t}from"./site-53d1aqt6.js";var e="lightProxyPixelShader",i=`flat varying vOffset: u32;flat varying vMask: u32;uniform tileMaskResolution: vec3f;var<storage,read_write> tileMaskBuffer: array<atomic<u32>>;@fragment
fn main(input: FragmentInputs)->FragmentOutputs {let maskResolution=vec2u(uniforms.tileMaskResolution.yz);let tilePosition=vec2u(fragmentInputs.position.xy);let tileIndex=(tilePosition.x*maskResolution.x+tilePosition.y)*maskResolution.y+fragmentInputs.vOffset;atomicOr(&tileMaskBuffer[tileIndex],fragmentInputs.vMask);}
`;if(!t.ShadersStoreWGSL[e])t.ShadersStoreWGSL[e]=i;var o={name:e,shader:i};
export{o as Ih};

//# debugId=1CD688F857274B2C64756E2164756E21
//# sourceMappingURL=site-14svhx3k.js.map
