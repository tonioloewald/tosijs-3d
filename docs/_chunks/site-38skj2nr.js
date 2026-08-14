import{_B as b}from"./site-1q3afg48.js";var f="vertexColorMixing",k=`#if defined(VERTEXCOLOR) || defined(INSTANCESCOLOR) && defined(INSTANCES)
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
`;if(!b.IncludesShadersStoreWGSL[f])b.IncludesShadersStoreWGSL[f]=k;var w={name:f,shader:k};
export{w as sA};

//# debugId=86950190C20C569264756E2164756E21
//# sourceMappingURL=site-38skj2nr.js.map
