import{_B as e}from"./site-ea0e8ybd.js";var t="bumpVertex",n=`#if defined(BUMP) || defined(PARALLAX) || defined(CLEARCOAT_BUMP) || defined(ANISOTROPIC)
#if defined(TANGENT) && defined(NORMAL)
var tbnNormal: vec3f=normalize(normalUpdated);var tbnTangent: vec3f=normalize(tangentUpdated.xyz);var tbnBitangent: vec3f=cross(tbnNormal,tbnTangent)*tangentUpdated.w;var matTemp= mat3x3f(finalWorld[0].xyz,finalWorld[1].xyz,finalWorld[2].xyz)* mat3x3f(tbnTangent,tbnBitangent,tbnNormal);vertexOutputs.vTBN0=matTemp[0];vertexOutputs.vTBN1=matTemp[1];vertexOutputs.vTBN2=matTemp[2];
#endif
#endif
`;if(!e.IncludesShadersStoreWGSL[t])e.IncludesShadersStoreWGSL[t]=n;var d={name:t,shader:n};
export{d as xz};

//# debugId=F0EC75058C40A5B164756E2164756E21
//# sourceMappingURL=site-whkpvt1p.js.map
