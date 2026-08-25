import{_B as o}from"./site-ea0e8ybd.js";var r="fogFragment",e=`#ifdef FOG
var fog: f32=CalcFogFactor();
#ifdef PBR
fog=toLinearSpace(fog);
#endif
color= vec4f(mix(uniforms.vFogColor,color.rgb,fog),color.a);
#endif
`;if(!o.IncludesShadersStoreWGSL[r])o.IncludesShadersStoreWGSL[r]=e;var a={name:r,shader:e};
export{a as FA};

//# debugId=0BFBFADA3B434A9564756E2164756E21
//# sourceMappingURL=site-kcvb8kks.js.map
