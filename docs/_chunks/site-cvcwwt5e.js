import{DD as r}from"./site-53d1aqt6.js";var e="fluidRenderingParticleThicknessPixelShader",n=`uniform particleAlpha: f32;varying uv: vec2f;@fragment
fn main(input: FragmentInputs)->FragmentOutputs {var normalxy: vec2f=input.uv*2.0-1.0;var r2: f32=dot(normalxy,normalxy);if (r2>1.0) {discard;}
var thickness: f32=sqrt(1.0-r2);fragmentOutputs.color=vec4f(vec3f(uniforms.particleAlpha*thickness),1.0);}
`;if(!r.ShadersStoreWGSL[e])r.ShadersStoreWGSL[e]=n;var a={name:e,shader:n};
export{a as Ag};

//# debugId=7EB0A6B740AF8C4D64756E2164756E21
//# sourceMappingURL=site-cvcwwt5e.js.map
