import{_B as b}from"./site-1q3afg48.js";var k="fogFragment",l=`#ifdef FOG
var fog: f32=CalcFogFactor();
#ifdef PBR
fog=toLinearSpace(fog);
#endif
color= vec4f(mix(uniforms.vFogColor,color.rgb,fog),color.a);
#endif
`;if(!b.IncludesShadersStoreWGSL[k])b.IncludesShadersStoreWGSL[k]=l;var v={name:k,shader:l};
export{v as FA};

//# debugId=EA596A6977553A8064756E2164756E21
//# sourceMappingURL=site-h2yr8kje.js.map
