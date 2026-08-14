import{_B as b}from"./site-1q3afg48.js";var k="fogFragment",l=`#ifdef FOG
float fog=CalcFogFactor();
#ifdef PBR
fog=toLinearSpace(fog);
#endif
color.rgb=mix(vFogColor,color.rgb,fog);
#endif
`;if(!b.IncludesShadersStore[k])b.IncludesShadersStore[k]=l;var v={name:k,shader:l};
export{v as nz};

//# debugId=6628F1483B2C37AF64756E2164756E21
//# sourceMappingURL=site-rfcgcv9w.js.map
