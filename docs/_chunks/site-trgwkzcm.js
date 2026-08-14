import{_B as b}from"./site-1q3afg48.js";var k="gaussianSplattingFragmentDeclaration",q=`fn gaussianColor(inColor: vec4f,inPosition: vec2f)->vec4f
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

//# debugId=2E15CDD3BB0404A164756E2164756E21
//# sourceMappingURL=site-trgwkzcm.js.map
