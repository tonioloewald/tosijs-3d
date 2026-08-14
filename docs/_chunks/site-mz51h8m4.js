import{_B as f}from"./site-1q3afg48.js";var k="bumpVertex",l=`#if defined(BUMP) || defined(PARALLAX) || defined(CLEARCOAT_BUMP) || defined(ANISOTROPIC)
#if defined(TANGENT) && defined(NORMAL)
vec3 tbnNormal=normalize(normalUpdated);vec3 tbnTangent=normalize(tangentUpdated.xyz);vec3 tbnBitangent=cross(tbnNormal,tbnTangent)*tangentUpdated.w;vTBN=mat3(finalWorld)*mat3(tbnTangent,tbnBitangent,tbnNormal);
#endif
#endif
`;if(!f.IncludesShadersStore[k])f.IncludesShadersStore[k]=l;var v={name:k,shader:l};
export{v as $x};

//# debugId=02EA03972ECEE23B64756E2164756E21
//# sourceMappingURL=site-mz51h8m4.js.map
