import{_B as b}from"./site-1q3afg48.js";var f="packingFunctions",l=`fn pack(depth: f32)->vec4f
{const bit_shift: vec4f= vec4f(255.0*255.0*255.0,255.0*255.0,255.0,1.0);const bit_mask: vec4f= vec4f(0.0,1.0/255.0,1.0/255.0,1.0/255.0);var res: vec4f=fract(depth*bit_shift);res-=res.xxyz*bit_mask;return res;}
fn unpack(color: vec4f)->f32
{const bit_shift: vec4f= vec4f(1.0/(255.0*255.0*255.0),1.0/(255.0*255.0),1.0/255.0,1.0);return dot(color,bit_shift);}`;if(!b.IncludesShadersStoreWGSL[f])b.IncludesShadersStoreWGSL[f]=l;var v={name:f,shader:l};
export{v as Oy};

//# debugId=1AB4CC655D3D588564756E2164756E21
//# sourceMappingURL=site-254yhd3e.js.map
