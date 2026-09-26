import{i}from"./site-1yf4ncc8.js";var e="fogVertexDeclaration",r=`#ifdef FOG
varying vec3 vFogDistance;
#endif
`;if(!i.IncludesShadersStore[e])i.IncludesShadersStore[e]=r;var ct={name:e,shader:r};var o="fogVertex",t=`#ifdef FOG
vFogDistance=(view*worldPos).xyz;
#endif
`;if(!i.IncludesShadersStore[o])i.IncludesShadersStore[o]=t;var _t={name:o,shader:t};
export{ct,_t};

//# debugId=E9A4B615E6DD7CC264756E2164756E21
//# sourceMappingURL=site-pq1eaaxg.js.map
