import{_B as f}from"./site-7jxv124x.js";var k="bumpVertex",l=`#if defined(BUMP) || defined(PARALLAX) || defined(CLEARCOAT_BUMP) || defined(ANISOTROPIC)
#if defined(TANGENT) && defined(NORMAL)
vec3 tbnNormal=normalize(normalUpdated);vec3 tbnTangent=normalize(tangentUpdated.xyz);vec3 tbnBitangent=cross(tbnNormal,tbnTangent)*tangentUpdated.w;vTBN=mat3(finalWorld)*mat3(tbnTangent,tbnBitangent,tbnNormal);
#endif
#endif
`;if(!f.IncludesShadersStore[k])f.IncludesShadersStore[k]=l;var v={name:k,shader:l};
export{v as $x};

//# debugId=29CC685A0332C31064756E2164756E21
//# sourceMappingURL=site-d0gj9afq.js.map
