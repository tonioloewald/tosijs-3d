import{DD as o}from"./site-53d1aqt6.js";var e="gaussianSplattingFragmentDeclaration",n=`fn gaussianColor(inColor: vec4f,inPosition: vec2f)->vec4f
{var A : f32=-dot(inPosition,inPosition);if (A>-4.0)
{var B: f32=exp(A)*inColor.a;
#include<logDepthFragment>
var color: vec3f=inColor.rgb;
#ifdef FOG
#include<fogFragment>
#endif
return vec4f(color,B);} else {return vec4f(0.0);}}
`;if(!o.IncludesShadersStoreWGSL[e])o.IncludesShadersStoreWGSL[e]=n;var a={name:e,shader:n};
export{a as Iz};

//# debugId=ECE4939E1D7FB41A64756E2164756E21
//# sourceMappingURL=site-pqcw4hy3.js.map
