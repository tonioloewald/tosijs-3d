import{_B as b}from"./site-1q3afg48.js";var k="gaussianSplattingFragmentDeclaration",q=`vec4 gaussianColor(vec4 inColor)
{float A=-dot(vPosition,vPosition);if (A<-4.0) discard;float B=exp(A)*inColor.a;
#include<logDepthFragment>
vec3 color=inColor.rgb;
#ifdef FOG
#include<fogFragment>
#endif
return vec4(color,B);}
`;if(!b.IncludesShadersStore[k])b.IncludesShadersStore[k]=q;var y={name:k,shader:q};
export{y as Py};

//# debugId=54C908BD74D449E864756E2164756E21
//# sourceMappingURL=site-fstw05em.js.map
