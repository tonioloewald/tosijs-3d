import{_B as b}from"./site-7jxv124x.js";var k="gaussianSplattingFragmentDeclaration",q=`fn gaussianColor(inColor: vec4f,inPosition: vec2f)->vec4f
{var A : f32=-dot(inPosition,inPosition);if (A>-4.0)
{var B: f32=exp(A)*inColor.a;
#include<logDepthFragment>
var color: vec3f=inColor.rgb;
#ifdef FOG
#include<fogFragment>
#endif
return vec4f(color,B);} else {return vec4f(0.0);}}
`;if(!b.IncludesShadersStoreWGSL[k])b.IncludesShadersStoreWGSL[k]=q;var y={name:k,shader:q};
export{y as Ny};

//# debugId=C4B3E9D48842529064756E2164756E21
//# sourceMappingURL=site-3g486e04.js.map
