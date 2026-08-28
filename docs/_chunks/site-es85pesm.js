import{DD as r}from"./site-53d1aqt6.js";var e="fluidRenderingParticleDiffusePixelShader",a=`uniform particleAlpha: f32;varying uv: vec2f;varying diffuseColor: vec3f;@fragment
fn main(input: FragmentInputs)->FragmentOutputs {var normalxy: vec2f=input.uv*2.0-1.0;var r2: f32=dot(normalxy,normalxy);if (r2>1.0) {discard;}
fragmentOutputs.color=vec4f(input.diffuseColor,1.0);}
`;if(!r.ShadersStoreWGSL[e])r.ShadersStoreWGSL[e]=a;var n={name:e,shader:a};
export{n as tg};

//# debugId=DF4A3E78E345033364756E2164756E21
//# sourceMappingURL=site-es85pesm.js.map
