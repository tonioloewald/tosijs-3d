import{_B as b}from"./site-7jxv124x.js";var f="clipPlaneVertex",k=`#ifdef CLIPPLANE
vertexOutputs.fClipDistance=dot(worldPos,uniforms.vClipPlane);
#endif
#ifdef CLIPPLANE2
vertexOutputs.fClipDistance2=dot(worldPos,uniforms.vClipPlane2);
#endif
#ifdef CLIPPLANE3
vertexOutputs.fClipDistance3=dot(worldPos,uniforms.vClipPlane3);
#endif
#ifdef CLIPPLANE4
vertexOutputs.fClipDistance4=dot(worldPos,uniforms.vClipPlane4);
#endif
#ifdef CLIPPLANE5
vertexOutputs.fClipDistance5=dot(worldPos,uniforms.vClipPlane5);
#endif
#ifdef CLIPPLANE6
vertexOutputs.fClipDistance6=dot(worldPos,uniforms.vClipPlane6);
#endif
`;if(!b.IncludesShadersStoreWGSL[f])b.IncludesShadersStoreWGSL[f]=k;var v={name:f,shader:k};
export{v as BA};

//# debugId=92AAF4582629888C64756E2164756E21
//# sourceMappingURL=site-q36bydad.js.map
