import{_B as b}from"./site-7jxv124x.js";var f="packingFunctions",l=`vec4 pack(float depth)
{const vec4 bit_shift=vec4(255.0*255.0*255.0,255.0*255.0,255.0,1.0);const vec4 bit_mask=vec4(0.0,1.0/255.0,1.0/255.0,1.0/255.0);vec4 res=fract(depth*bit_shift);res-=res.xxyz*bit_mask;return res;}
float unpack(vec4 color)
{const vec4 bit_shift=vec4(1.0/(255.0*255.0*255.0),1.0/(255.0*255.0),1.0/255.0,1.0);return dot(color,bit_shift);}`;if(!b.IncludesShadersStore[f])b.IncludesShadersStore[f]=l;var v={name:f,shader:l};
export{v as Qy};

//# debugId=E0533EB4A5B680B264756E2164756E21
//# sourceMappingURL=site-0a9f6pgd.js.map
