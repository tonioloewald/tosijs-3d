import{DD as o}from"./site-53d1aqt6.js";var e="gaussianSplattingFragmentDeclaration",r=`vec4 gaussianColor(vec4 inColor)
{float A=-dot(vPosition,vPosition);if (A<-4.0) discard;float B=exp(A)*inColor.a;
#include<logDepthFragment>
vec3 color=inColor.rgb;
#ifdef FOG
#include<fogFragment>
#endif
return vec4(color,B);}
`;if(!o.IncludesShadersStore[e])o.IncludesShadersStore[e]=r;var i={name:e,shader:r};
export{i as Rz};

//# debugId=BACF97551552119B64756E2164756E21
//# sourceMappingURL=site-x9vxg16m.js.map
