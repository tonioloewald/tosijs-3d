import{_B as f}from"./site-1q3afg48.js";var k="bumpVertex",l=`#if defined(BUMP) || defined(PARALLAX) || defined(CLEARCOAT_BUMP) || defined(ANISOTROPIC)
#if defined(TANGENT) && defined(NORMAL)
var tbnNormal: vec3f=normalize(normalUpdated);var tbnTangent: vec3f=normalize(tangentUpdated.xyz);var tbnBitangent: vec3f=cross(tbnNormal,tbnTangent)*tangentUpdated.w;var matTemp= mat3x3f(finalWorld[0].xyz,finalWorld[1].xyz,finalWorld[2].xyz)* mat3x3f(tbnTangent,tbnBitangent,tbnNormal);vertexOutputs.vTBN0=matTemp[0];vertexOutputs.vTBN1=matTemp[1];vertexOutputs.vTBN2=matTemp[2];
#endif
#endif
`;if(!f.IncludesShadersStoreWGSL[k])f.IncludesShadersStoreWGSL[k]=l;var v={name:k,shader:l};
export{v as xz};

//# debugId=3E0CBBAA9738172464756E2164756E21
//# sourceMappingURL=site-n2h1q3bp.js.map
