import{i}from"./site-1yf4ncc8.js";var e="fogVertexDeclaration",r=`#ifdef FOG
varying vec3 vFogDistance;
#endif
`;if(!i.IncludesShadersStore[e])i.IncludesShadersStore[e]=r;var ht={name:e,shader:r};var o="fogVertex",t=`#ifdef FOG
vFogDistance=(view*worldPos).xyz;
#endif
`;if(!i.IncludesShadersStore[o])i.IncludesShadersStore[o]=t;var yt={name:o,shader:t};
export{ht,yt};

//# debugId=89BE7A9AF9280F5964756E2164756E21
//# sourceMappingURL=site-d8ebacz5.js.map
