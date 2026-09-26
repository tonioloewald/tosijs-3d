import{i}from"./site-1yf4ncc8.js";var t="logDepthVertex",e=`#ifdef LOGARITHMICDEPTH
vertexOutputs.vFragmentDepth=1.0+vertexOutputs.position.w;vertexOutputs.position.z=log2(max(0.000001,vertexOutputs.vFragmentDepth))*uniforms.logarithmicDepthConstant;
#endif
`;if(!i.IncludesShadersStoreWGSL[t])i.IncludesShadersStoreWGSL[t]=e;var Je={name:t,shader:e};
export{Je};

//# debugId=7C6863536208CBA864756E2164756E21
//# sourceMappingURL=site-p3sjwtn5.js.map
