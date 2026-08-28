import{DD as e}from"./site-53d1aqt6.js";var o="vertexColorMixing",d=`#if defined(VERTEXCOLOR) || defined(INSTANCESCOLOR) && defined(INSTANCES)
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
export{i as mA};

//# debugId=FC8867C4B288B83164756E2164756E21
//# sourceMappingURL=site-5hpywt0t.js.map
