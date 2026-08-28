import{DD as o}from"./site-53d1aqt6.js";var e="fogFragment",r=`#ifdef FOG
float fog=CalcFogFactor();
#ifdef PBR
fog=toLinearSpace(fog);
#endif
color.rgb=mix(vFogColor,color.rgb,fog);
#endif
`;if(!o.IncludesShadersStore[e])o.IncludesShadersStore[e]=r;var t={name:e,shader:r};
export{t as yA};

//# debugId=C1BD0F9B471B350064756E2164756E21
//# sourceMappingURL=site-drqg20zy.js.map
