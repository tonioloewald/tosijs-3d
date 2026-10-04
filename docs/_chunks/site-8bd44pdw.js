import{i}from"./site-1yf4ncc8.js";var e="fogVertexDeclaration",r=`#ifdef FOG
varying vec3 vFogDistance;
#endif
`;if(!i.IncludesShadersStore[e])i.IncludesShadersStore[e]=r;var at={name:e,shader:r};var o="fogVertex",t=`#ifdef FOG
vFogDistance=(view*worldPos).xyz;
#endif
`;if(!i.IncludesShadersStore[o])i.IncludesShadersStore[o]=t;var _t={name:o,shader:t};
export{at,_t};

//# debugId=382E31BB16965F3864756E2164756E21
//# sourceMappingURL=site-8bd44pdw.js.map
