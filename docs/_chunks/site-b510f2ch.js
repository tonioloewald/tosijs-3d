import{_B as e}from"./site-ea0e8ybd.js";var t="clusteredLightingFunctions",i=`struct ClusteredLight {vLightData: vec4f,
vLightDiffuse: vec4f,
vLightSpecular: vec4f,
vLightDirection: vec4f,
vLightFalloff: vec4f,}
fn getClusteredLight(lightDataTexture: texture_2d<f32>,index: u32)->ClusteredLight {return ClusteredLight(
textureLoad(lightDataTexture,vec2u(0,index),0),
textureLoad(lightDataTexture,vec2u(1,index),0),
textureLoad(lightDataTexture,vec2u(2,index),0),
textureLoad(lightDataTexture,vec2u(3,index),0),
textureLoad(lightDataTexture,vec2u(4,index),0)
);}
fn getClusteredSliceIndex(sliceData: vec2f,viewDepth: f32)->i32 {return i32(log(viewDepth)*sliceData.x+sliceData.y);}
`;if(!e.IncludesShadersStoreWGSL[t])e.IncludesShadersStoreWGSL[t]=i;var u={name:t,shader:i};
export{u as bA};

//# debugId=B0F81B6235BC424964756E2164756E21
//# sourceMappingURL=site-b510f2ch.js.map
