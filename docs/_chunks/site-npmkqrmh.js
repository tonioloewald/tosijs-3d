import{_B as o}from"./site-ea0e8ybd.js";var e="fogFragment",r=`#ifdef FOG
float fog=CalcFogFactor();
#ifdef PBR
fog=toLinearSpace(fog);
#endif
color.rgb=mix(vFogColor,color.rgb,fog);
#endif
`;if(!o.IncludesShadersStore[e])o.IncludesShadersStore[e]=r;var t={name:e,shader:r};
export{t as nz};

//# debugId=83855EE837BA3F9C64756E2164756E21
//# sourceMappingURL=site-npmkqrmh.js.map
