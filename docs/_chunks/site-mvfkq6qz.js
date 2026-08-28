import{DD as t}from"./site-53d1aqt6.js";var e="logDepthVertex",r=`#ifdef LOGARITHMICDEPTH
vertexOutputs.vFragmentDepth=1.0+vertexOutputs.position.w;vertexOutputs.position.z=log2(max(0.000001,vertexOutputs.vFragmentDepth))*uniforms.logarithmicDepthConstant;
#endif
`;if(!t.IncludesShadersStoreWGSL[e])t.IncludesShadersStoreWGSL[e]=r;var s={name:e,shader:r};
export{s as Mz};

//# debugId=DE21CDB4CED945B364756E2164756E21
//# sourceMappingURL=site-mvfkq6qz.js.map
