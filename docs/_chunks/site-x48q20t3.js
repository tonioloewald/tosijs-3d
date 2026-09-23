import{FD as e}from"./site-vrsvvb55.js";var o="vertexColorMixing",d=`#if defined(VERTEXCOLOR) || defined(INSTANCESCOLOR) && defined(INSTANCES)
vColor=vec4(1.0);
#ifdef VERTEXCOLOR
#ifdef VERTEXALPHA
vColor*=colorUpdated;
#else
vColor.rgb*=colorUpdated.rgb;
#endif
#endif
#ifdef INSTANCESCOLOR
vColor*=instanceColor;
#endif
#endif
`;if(!e.IncludesShadersStore[o])e.IncludesShadersStore[o]=d;var i={name:o,shader:d};
export{i as oA};

//# debugId=62C3500B08F955D164756E2164756E21
//# sourceMappingURL=site-x48q20t3.js.map
