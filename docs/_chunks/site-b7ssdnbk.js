import{i}from"./site-1yf4ncc8.js";var e="vertexColorMixing",o=`#if defined(VERTEXCOLOR) || defined(INSTANCESCOLOR) && defined(INSTANCES)
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
`;if(!i.IncludesShadersStore[e])i.IncludesShadersStore[e]=o;var vi={name:e,shader:o};
export{vi};

//# debugId=5CD9F83B47AB847464756E2164756E21
//# sourceMappingURL=site-b7ssdnbk.js.map
