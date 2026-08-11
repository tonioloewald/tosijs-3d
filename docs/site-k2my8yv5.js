import{_B as b}from"./site-7jxv124x.js";var k="fluidRenderingParticleDiffusePixelShader",q=`uniform particleAlpha: f32;varying uv: vec2f;varying diffuseColor: vec3f;@fragment
fn main(input: FragmentInputs)->FragmentOutputs {var normalxy: vec2f=input.uv*2.0-1.0;var r2: f32=dot(normalxy,normalxy);if (r2>1.0) {discard;}
fragmentOutputs.color=vec4f(input.diffuseColor,1.0);}
`;if(!b.ShadersStoreWGSL[k])b.ShadersStoreWGSL[k]=q;var w={name:k,shader:q};
export{w as ng};

//# debugId=408BFD25D2BFAC3B64756E2164756E21
//# sourceMappingURL=site-k2my8yv5.js.map
