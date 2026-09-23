import{FD as t}from"./site-vrsvvb55.js";var e="logDepthVertex",r=`#ifdef LOGARITHMICDEPTH
vertexOutputs.vFragmentDepth=1.0+vertexOutputs.position.w;vertexOutputs.position.z=log2(max(0.000001,vertexOutputs.vFragmentDepth))*uniforms.logarithmicDepthConstant;
#endif
`;if(!t.IncludesShadersStoreWGSL[e])t.IncludesShadersStoreWGSL[e]=r;var s={name:e,shader:r};
export{s as Oz};

//# debugId=6805652A0571E8BC64756E2164756E21
//# sourceMappingURL=site-bv1k2m3f.js.map
