import{i}from"./site-1yf4ncc8.js";var e="fogVertexDeclaration",r=`#ifdef FOG
varying vec3 vFogDistance;
#endif
`;if(!i.IncludesShadersStore[e])i.IncludesShadersStore[e]=r;var ut={name:e,shader:r};var o="fogVertex",t=`#ifdef FOG
vFogDistance=(view*worldPos).xyz;
#endif
`;if(!i.IncludesShadersStore[o])i.IncludesShadersStore[o]=t;var vt={name:o,shader:t};
export{ut,vt};

//# debugId=A2FB20C1A163E40164756E2164756E21
//# sourceMappingURL=site-twwgzfz0.js.map
