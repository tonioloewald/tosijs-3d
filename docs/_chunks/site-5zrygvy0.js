import{i}from"./site-1yf4ncc8.js";var e="vertexColorMixing",t=`#if defined(VERTEXCOLOR) || defined(INSTANCESCOLOR) && defined(INSTANCES)
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
`;if(!i.IncludesShadersStoreWGSL[e])i.IncludesShadersStoreWGSL[e]=t;var mi={name:e,shader:t};
export{mi};

//# debugId=0326CEF51BA04F6B64756E2164756E21
//# sourceMappingURL=site-5zrygvy0.js.map
