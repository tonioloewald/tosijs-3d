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
`;if(!i.IncludesShadersStore[e])i.IncludesShadersStore[e]=o;var bi={name:e,shader:o};
export{bi};

//# debugId=CE3EEC59230678A164756E2164756E21
//# sourceMappingURL=site-57ck3y08.js.map
