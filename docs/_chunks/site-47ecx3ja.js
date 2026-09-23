import{FD as t}from"./site-vrsvvb55.js";var e="packingFunctions",c=`vec4 pack(float depth)
{const vec4 bit_shift=vec4(255.0*255.0*255.0,255.0*255.0,255.0,1.0);const vec4 bit_mask=vec4(0.0,1.0/255.0,1.0/255.0,1.0/255.0);vec4 res=fract(depth*bit_shift);res-=res.xxyz*bit_mask;return res;}
float unpack(vec4 color)
{const vec4 bit_shift=vec4(1.0/(255.0*255.0*255.0),1.0/(255.0*255.0),1.0/255.0,1.0);return dot(color,bit_shift);}`;if(!t.IncludesShadersStore[e])t.IncludesShadersStore[e]=c;var o={name:e,shader:c};
export{o as Uz};

//# debugId=9FAED0B27A38687E64756E2164756E21
//# sourceMappingURL=site-47ecx3ja.js.map
