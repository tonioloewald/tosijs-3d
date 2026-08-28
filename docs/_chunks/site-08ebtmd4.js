import{DD as e}from"./site-53d1aqt6.js";var r="taaPixelShader",t=`varying vUV: vec2f;var textureSampler: texture_2d<f32>;var historySampler: texture_2d<f32>;
#ifdef TAA_REPROJECT_HISTORY
var historySamplerSampler: sampler;var velocitySampler: texture_2d<f32>;
#endif
uniform factor: f32;@fragment
fn main(input: FragmentInputs)->FragmentOutputs {let pos=vec2i(fragmentInputs.position.xy);let c=textureLoad(textureSampler,pos,0);
#ifdef TAA_REPROJECT_HISTORY
let v=textureLoad(velocitySampler,pos,0);var h=textureSample(historySampler,historySamplerSampler,input.vUV+v.xy);
#else
var h=textureLoad(historySampler,pos,0);
#endif
#ifdef TAA_CLAMP_HISTORY
var cmin=vec4f(1);var cmax=vec4f(0);for (var x=-1; x<=1; x+=1) {for (var y=-1; y<=1; y+=1) {let c=textureLoad(textureSampler,pos+vec2i(x,y),0);cmin=min(cmin,c);cmax=max(cmax,c);}}
h=clamp(h,cmin,cmax);
#endif
fragmentOutputs.color= mix(h,c,uniforms.factor);}
`;if(!e.ShadersStoreWGSL[r])e.ShadersStoreWGSL[r]=t;var m={name:r,shader:t};
export{m as sk};

//# debugId=C450DE36904F397A64756E2164756E21
//# sourceMappingURL=site-08ebtmd4.js.map
