import{_B as b}from"./site-1q3afg48.js";var f="logDepthVertex",k=`#ifdef LOGARITHMICDEPTH
vertexOutputs.vFragmentDepth=1.0+vertexOutputs.position.w;vertexOutputs.position.z=log2(max(0.000001,vertexOutputs.vFragmentDepth))*uniforms.logarithmicDepthConstant;
#endif
`;if(!b.IncludesShadersStoreWGSL[f])b.IncludesShadersStoreWGSL[f]=k;var v={name:f,shader:k};
export{v as Mz};

//# debugId=FEF4A11E846283D864756E2164756E21
//# sourceMappingURL=site-gv8wrsgb.js.map
