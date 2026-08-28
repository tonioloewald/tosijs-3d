import{DD as t}from"./site-53d1aqt6.js";var e="packingFunctions",c=`vec4 pack(float depth)
{const vec4 bit_shift=vec4(255.0*255.0*255.0,255.0*255.0,255.0,1.0);const vec4 bit_mask=vec4(0.0,1.0/255.0,1.0/255.0,1.0/255.0);vec4 res=fract(depth*bit_shift);res-=res.xxyz*bit_mask;return res;}
float unpack(vec4 color)
{const vec4 bit_shift=vec4(1.0/(255.0*255.0*255.0),1.0/(255.0*255.0),1.0/255.0,1.0);return dot(color,bit_shift);}`;if(!t.IncludesShadersStore[e])t.IncludesShadersStore[e]=c;var o={name:e,shader:c};
export{o as Sz};

//# debugId=5C5BA247EA348BFC64756E2164756E21
//# sourceMappingURL=site-1n06q2g1.js.map
