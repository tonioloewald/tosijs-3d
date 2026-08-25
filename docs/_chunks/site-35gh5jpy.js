import{_B as e}from"./site-ea0e8ybd.js";var i="clipPlaneVertex",t=`#ifdef CLIPPLANE
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
`;if(!e.IncludesShadersStoreWGSL[i])e.IncludesShadersStoreWGSL[i]=t;var f={name:i,shader:t};
export{f as BA};

//# debugId=C159219254BB966864756E2164756E21
//# sourceMappingURL=site-35gh5jpy.js.map
