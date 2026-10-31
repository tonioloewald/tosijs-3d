import{i}from"./site-1yf4ncc8.js";var e="bumpVertex",n=`#if defined(BUMP) || defined(PARALLAX) || defined(CLEARCOAT_BUMP) || defined(ANISOTROPIC)
#if defined(TANGENT) && defined(NORMAL)
vec3 tbnNormal=normalize(normalUpdated);vec3 tbnTangent=normalize(tangentUpdated.xyz);vec3 tbnBitangent=cross(tbnNormal,tbnTangent)*tangentUpdated.w;vTBN=mat3(finalWorld)*mat3(tbnTangent,tbnBitangent,tbnNormal);
#endif
#endif
`;if(!i.IncludesShadersStore[e])i.IncludesShadersStore[e]=n;var Hl={name:e,shader:n};
export{Hl};

//# debugId=6D9C87F4114E837164756E2164756E21
//# sourceMappingURL=site-2menz3y5.js.map
