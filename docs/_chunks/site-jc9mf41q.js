import{_B as e}from"./site-ea0e8ybd.js";var o="vertexColorMixing",d=`#if defined(VERTEXCOLOR) || defined(INSTANCESCOLOR) && defined(INSTANCES)
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
export{i as az};

//# debugId=2A17375CA1025E8864756E2164756E21
//# sourceMappingURL=site-jc9mf41q.js.map
