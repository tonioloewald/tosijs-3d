import{_B as b}from"./site-7jxv124x.js";var k="fogFragment",l=`#ifdef FOG
var fog: f32=CalcFogFactor();
#ifdef PBR
fog=toLinearSpace(fog);
#endif
color= vec4f(mix(uniforms.vFogColor,color.rgb,fog),color.a);
#endif
`;if(!b.IncludesShadersStoreWGSL[k])b.IncludesShadersStoreWGSL[k]=l;var v={name:k,shader:l};
export{v as FA};

//# debugId=002D7CCA0C781A6F64756E2164756E21
//# sourceMappingURL=site-psb0h7wx.js.map
