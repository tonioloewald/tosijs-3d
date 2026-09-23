import{FD as o}from"./site-vrsvvb55.js";var e="fogFragment",r=`#ifdef FOG
float fog=CalcFogFactor();
#ifdef PBR
fog=toLinearSpace(fog);
#endif
color.rgb=mix(vFogColor,color.rgb,fog);
#endif
`;if(!o.IncludesShadersStore[e])o.IncludesShadersStore[e]=r;var t={name:e,shader:r};
export{t as AA};

//# debugId=5B56F68076412F9064756E2164756E21
//# sourceMappingURL=site-gczq6jz1.js.map
