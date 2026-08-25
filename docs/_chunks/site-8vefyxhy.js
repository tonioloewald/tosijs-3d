import{_B as r}from"./site-ea0e8ybd.js";var e="fluidRenderingParticleDiffusePixelShader",a=`uniform particleAlpha: f32;varying uv: vec2f;varying diffuseColor: vec3f;@fragment
fn main(input: FragmentInputs)->FragmentOutputs {var normalxy: vec2f=input.uv*2.0-1.0;var r2: f32=dot(normalxy,normalxy);if (r2>1.0) {discard;}
fragmentOutputs.color=vec4f(input.diffuseColor,1.0);}
`;if(!r.ShadersStoreWGSL[e])r.ShadersStoreWGSL[e]=a;var n={name:e,shader:a};
export{n as ng};

//# debugId=CBC87087D372E00E64756E2164756E21
//# sourceMappingURL=site-8vefyxhy.js.map
