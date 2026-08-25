import{_B as t}from"./site-ea0e8ybd.js";var e="packingFunctions",c=`fn pack(depth: f32)->vec4f
{const bit_shift: vec4f= vec4f(255.0*255.0*255.0,255.0*255.0,255.0,1.0);const bit_mask: vec4f= vec4f(0.0,1.0/255.0,1.0/255.0,1.0/255.0);var res: vec4f=fract(depth*bit_shift);res-=res.xxyz*bit_mask;return res;}
fn unpack(color: vec4f)->f32
{const bit_shift: vec4f= vec4f(1.0/(255.0*255.0*255.0),1.0/(255.0*255.0),1.0/255.0,1.0);return dot(color,bit_shift);}`;if(!t.IncludesShadersStoreWGSL[e])t.IncludesShadersStoreWGSL[e]=c;var r={name:e,shader:c};
export{r as Oy};

//# debugId=9E047A025B5BC02164756E2164756E21
//# sourceMappingURL=site-s6qzsvbs.js.map
