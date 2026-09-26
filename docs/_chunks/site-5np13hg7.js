import{i}from"./site-1yf4ncc8.js";var t="packingFunctions",o=`vec4 pack(float depth)
{const vec4 bit_shift=vec4(255.0*255.0*255.0,255.0*255.0,255.0,1.0);const vec4 bit_mask=vec4(0.0,1.0/255.0,1.0/255.0,1.0/255.0);vec4 res=fract(depth*bit_shift);res-=res.xxyz*bit_mask;return res;}
float unpack(vec4 color)
{const vec4 bit_shift=vec4(1.0/(255.0*255.0*255.0),1.0/(255.0*255.0),1.0/255.0,1.0);return dot(color,bit_shift);}`;if(!i.IncludesShadersStore[t])i.IncludesShadersStore[t]=o;var _n={name:t,shader:o};var e="gaussianSplattingFragmentDeclaration",r=`vec4 gaussianColor(vec4 inColor)
{float A=-dot(vPosition,vPosition);if (A<-4.0) discard;float B=exp(A)*inColor.a;
#include<logDepthFragment>
vec3 color=inColor.rgb;
#ifdef FOG
#include<fogFragment>
#endif
return vec4(color,B);}
`;if(!i.IncludesShadersStore[e])i.IncludesShadersStore[e]=r;var Jf={name:e,shader:r};
export{_n,Jf};

//# debugId=EABD03C8E37A579764756E2164756E21
//# sourceMappingURL=site-5np13hg7.js.map
