import{_B as b}from"./site-1q3afg48.js";var f="packingFunctions",l=`vec4 pack(float depth)
{const vec4 bit_shift=vec4(255.0*255.0*255.0,255.0*255.0,255.0,1.0);const vec4 bit_mask=vec4(0.0,1.0/255.0,1.0/255.0,1.0/255.0);vec4 res=fract(depth*bit_shift);res-=res.xxyz*bit_mask;return res;}
float unpack(vec4 color)
{const vec4 bit_shift=vec4(1.0/(255.0*255.0*255.0),1.0/(255.0*255.0),1.0/255.0,1.0);return dot(color,bit_shift);}`;if(!b.IncludesShadersStore[f])b.IncludesShadersStore[f]=l;var v={name:f,shader:l};
export{v as Qy};

//# debugId=C0FE7AC17B59D52364756E2164756E21
//# sourceMappingURL=site-hgrba224.js.map
