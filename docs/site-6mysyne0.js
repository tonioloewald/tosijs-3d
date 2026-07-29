import{_B as b}from"./site-7jxv124x.js";var f="vertexColorMixing",k=`#if defined(VERTEXCOLOR) || defined(INSTANCESCOLOR) && defined(INSTANCES)
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

//# debugId=48E3F01DDFEAF95664756E2164756E21
//# sourceMappingURL=site-6mysyne0.js.map
