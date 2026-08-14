import{_B as b}from"./site-1q3afg48.js";var q="fluidRenderingParticleThicknessPixelShader",v=`uniform particleAlpha: f32;varying uv: vec2f;@fragment
fn main(input: FragmentInputs)->FragmentOutputs {var normalxy: vec2f=input.uv*2.0-1.0;var r2: f32=dot(normalxy,normalxy);if (r2>1.0) {discard;}
var thickness: f32=sqrt(1.0-r2);fragmentOutputs.color=vec4f(vec3f(uniforms.particleAlpha*thickness),1.0);}
`;if(!b.ShadersStoreWGSL[q])b.ShadersStoreWGSL[q]=v;var x={name:q,shader:v};
export{x as Kg};

//# debugId=BD71C18696FD98C764756E2164756E21
//# sourceMappingURL=site-yghkm29e.js.map
