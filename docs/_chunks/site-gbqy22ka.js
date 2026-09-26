import{i}from"./site-1yf4ncc8.js";var t="logDepthVertex",e=`#ifdef LOGARITHMICDEPTH
vertexOutputs.vFragmentDepth=1.0+vertexOutputs.position.w;vertexOutputs.position.z=log2(max(0.000001,vertexOutputs.vFragmentDepth))*uniforms.logarithmicDepthConstant;
#endif
`;if(!i.IncludesShadersStoreWGSL[t])i.IncludesShadersStoreWGSL[t]=e;var st={name:t,shader:e};
export{st};

//# debugId=35543F1D30B3291964756E2164756E21
//# sourceMappingURL=site-gbqy22ka.js.map
