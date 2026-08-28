import{DD as e}from"./site-53d1aqt6.js";var n="bumpVertex",t=`#if defined(BUMP) || defined(PARALLAX) || defined(CLEARCOAT_BUMP) || defined(ANISOTROPIC)
#if defined(TANGENT) && defined(NORMAL)
vec3 tbnNormal=normalize(normalUpdated);vec3 tbnTangent=normalize(tangentUpdated.xyz);vec3 tbnBitangent=cross(tbnNormal,tbnTangent)*tangentUpdated.w;vTBN=mat3(finalWorld)*mat3(tbnTangent,tbnBitangent,tbnNormal);
#endif
#endif
`;if(!e.IncludesShadersStore[n])e.IncludesShadersStore[n]=t;var a={name:n,shader:t};
export{a as $y};

//# debugId=2142AB11BBE2474A64756E2164756E21
//# sourceMappingURL=site-tfyj7x3c.js.map
