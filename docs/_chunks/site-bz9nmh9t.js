import{_B as b}from"./site-1q3afg48.js";var k="meshUVSpaceRendererPixelShader",l=`varying vDecalTC: vec2f;var textureSamplerSampler: sampler;var textureSampler: texture_2d<f32>;@fragment
fn main(input: FragmentInputs)->FragmentOutputs {if (input.vDecalTC.x<0. || input.vDecalTC.x>1. || input.vDecalTC.y<0. || input.vDecalTC.y>1.) {discard;}
fragmentOutputs.color=textureSample(textureSampler,textureSamplerSampler,input.vDecalTC);}
`;if(!b.ShadersStoreWGSL[k])b.ShadersStoreWGSL[k]=l;var v={name:k,shader:l};
export{v as nh};

//# debugId=9F330158FBAABEFE64756E2164756E21
//# sourceMappingURL=site-bz9nmh9t.js.map
