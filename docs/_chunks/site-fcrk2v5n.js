import{_B as k}from"./site-1q3afg48.js";var q="iblCdfxPixelShader",v=`#define PI 3.1415927
varying vUV: vec2f;var cdfy: texture_2d<f32>;@fragment
fn main(input: FragmentInputs)->FragmentOutputs {var cdfyRes=textureDimensions(cdfy,0);var currentPixel=vec2u(fragmentInputs.position.xy);var cdfx: f32=0.0;for (var x: u32=1; x<=currentPixel.x; x++) {cdfx+=textureLoad(cdfy, vec2u(x-1,cdfyRes.y-1),0).x;}
fragmentOutputs.color= vec4f( vec3f(cdfx),1.0);}`;if(!k.ShadersStoreWGSL[q])k.ShadersStoreWGSL[q]=v;var y={name:q,shader:v};
export{y as ni};

//# debugId=1151B9AE5DB8D0DF64756E2164756E21
//# sourceMappingURL=site-fcrk2v5n.js.map
