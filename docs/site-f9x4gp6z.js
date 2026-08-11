import{_B as b}from"./site-7jxv124x.js";var k="fogFragment",l=`#ifdef FOG
float fog=CalcFogFactor();
#ifdef PBR
fog=toLinearSpace(fog);
#endif
color.rgb=mix(vFogColor,color.rgb,fog);
#endif
`;if(!b.IncludesShadersStore[k])b.IncludesShadersStore[k]=l;var v={name:k,shader:l};
export{v as nz};

//# debugId=CBDC76E6CFC0A28B64756E2164756E21
//# sourceMappingURL=site-f9x4gp6z.js.map
