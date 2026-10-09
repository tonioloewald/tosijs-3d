import{i}from"./site-1yf4ncc8.js";var t="logDepthVertex",e=`#ifdef LOGARITHMICDEPTH
vertexOutputs.vFragmentDepth=1.0+vertexOutputs.position.w;vertexOutputs.position.z=log2(max(0.000001,vertexOutputs.vFragmentDepth))*uniforms.logarithmicDepthConstant;
#endif
`;if(!i.IncludesShadersStoreWGSL[t])i.IncludesShadersStoreWGSL[t]=e;var it={name:t,shader:e};
export{it};

//# debugId=909EFD39EFEA639A64756E2164756E21
//# sourceMappingURL=site-dh95za6w.js.map
