import{_B as t}from"./site-ea0e8ybd.js";var e="logDepthVertex",r=`#ifdef LOGARITHMICDEPTH
vertexOutputs.vFragmentDepth=1.0+vertexOutputs.position.w;vertexOutputs.position.z=log2(max(0.000001,vertexOutputs.vFragmentDepth))*uniforms.logarithmicDepthConstant;
#endif
`;if(!t.IncludesShadersStoreWGSL[e])t.IncludesShadersStoreWGSL[e]=r;var s={name:e,shader:r};
export{s as Mz};

//# debugId=E3063B42303CF71B64756E2164756E21
//# sourceMappingURL=site-sxz4tpxg.js.map
