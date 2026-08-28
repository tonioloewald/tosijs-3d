import{DD as o}from"./site-53d1aqt6.js";var r="fogFragment",e=`#ifdef FOG
var fog: f32=CalcFogFactor();
#ifdef PBR
fog=toLinearSpace(fog);
#endif
color= vec4f(mix(uniforms.vFogColor,color.rgb,fog),color.a);
#endif
`;if(!o.IncludesShadersStoreWGSL[r])o.IncludesShadersStoreWGSL[r]=e;var a={name:r,shader:e};
export{a as iA};

//# debugId=1B5618BB76B2207C64756E2164756E21
//# sourceMappingURL=site-jb4tcghj.js.map
