import{FD as o}from"./site-vrsvvb55.js";var r="fogFragment",e=`#ifdef FOG
var fog: f32=CalcFogFactor();
#ifdef PBR
fog=toLinearSpace(fog);
#endif
color= vec4f(mix(uniforms.vFogColor,color.rgb,fog),color.a);
#endif
`;if(!o.IncludesShadersStoreWGSL[r])o.IncludesShadersStoreWGSL[r]=e;var a={name:r,shader:e};
export{a as kA};

//# debugId=8577C630057668F864756E2164756E21
//# sourceMappingURL=site-trx32srv.js.map
