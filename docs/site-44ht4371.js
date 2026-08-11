import{_B as b}from"./site-7jxv124x.js";var k="gaussianSplattingFragmentDeclaration",q=`vec4 gaussianColor(vec4 inColor)
{float A=-dot(vPosition,vPosition);if (A<-4.0) discard;float B=exp(A)*inColor.a;
#include<logDepthFragment>
vec3 color=inColor.rgb;
#ifdef FOG
#include<fogFragment>
#endif
return vec4(color,B);}
`;if(!b.IncludesShadersStore[k])b.IncludesShadersStore[k]=q;var y={name:k,shader:q};
export{y as Py};

//# debugId=C8068102ED9D0CD564756E2164756E21
//# sourceMappingURL=site-44ht4371.js.map
