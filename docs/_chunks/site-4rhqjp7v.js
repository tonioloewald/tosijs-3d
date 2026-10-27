import{i}from"./site-1yf4ncc8.js";var e="fogVertexDeclaration",r=`#ifdef FOG
varying vec3 vFogDistance;
#endif
`;if(!i.IncludesShadersStore[e])i.IncludesShadersStore[e]=r;var ht={name:e,shader:r};var o="fogVertex",t=`#ifdef FOG
vFogDistance=(view*worldPos).xyz;
#endif
`;if(!i.IncludesShadersStore[o])i.IncludesShadersStore[o]=t;var vt={name:o,shader:t};
export{ht,vt};

//# debugId=7D1E8943757BB5DD64756E2164756E21
//# sourceMappingURL=site-4rhqjp7v.js.map
