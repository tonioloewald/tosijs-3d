import{_B as b}from"./site-1q3afg48.js";var f="vertexColorMixing",k=`#if defined(VERTEXCOLOR) || defined(INSTANCESCOLOR) && defined(INSTANCES)
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
`;if(!b.IncludesShadersStore[f])b.IncludesShadersStore[f]=k;var w={name:f,shader:k};
export{w as az};

//# debugId=2694F52CB7EE8B8464756E2164756E21
//# sourceMappingURL=site-bxq8qnzk.js.map
