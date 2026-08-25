import{_B as e}from"./site-ea0e8ybd.js";var t="vertexColorMixing",r=`#if defined(VERTEXCOLOR) || defined(INSTANCESCOLOR) && defined(INSTANCES)
vertexOutputs.vColor=vec4f(1.0);
#ifdef VERTEXCOLOR
#ifdef VERTEXALPHA
vertexOutputs.vColor*=colorUpdated;
#else
vertexOutputs.vColor=vec4f(vertexOutputs.vColor.rgb*colorUpdated.rgb,vertexOutputs.vColor.a);
#endif
#endif
#ifdef INSTANCESCOLOR
vertexOutputs.vColor*=vertexInputs.instanceColor;
#endif
#endif
`;if(!e.IncludesShadersStoreWGSL[t])e.IncludesShadersStoreWGSL[t]=r;var d={name:t,shader:r};
export{d as sA};

//# debugId=92AF8865135E1E2A64756E2164756E21
//# sourceMappingURL=site-y7h65xf9.js.map
