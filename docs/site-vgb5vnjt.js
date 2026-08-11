import{_B as b}from"./site-7jxv124x.js";var f="logDepthVertex",k=`#ifdef LOGARITHMICDEPTH
vertexOutputs.vFragmentDepth=1.0+vertexOutputs.position.w;vertexOutputs.position.z=log2(max(0.000001,vertexOutputs.vFragmentDepth))*uniforms.logarithmicDepthConstant;
#endif
`;if(!b.IncludesShadersStoreWGSL[f])b.IncludesShadersStoreWGSL[f]=k;var v={name:f,shader:k};
export{v as Mz};

//# debugId=D5A1EA1F1AB0ED7B64756E2164756E21
//# sourceMappingURL=site-vgb5vnjt.js.map
