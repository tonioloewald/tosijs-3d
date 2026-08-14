import{_B as b}from"./site-1q3afg48.js";var f="decalFragment",k=`#ifdef DECAL
var decalTempColor=decalColor.rgb;var decalTempAlpha=decalColor.a;
#ifdef GAMMADECAL
decalTempColor=toLinearSpaceVec3(decalColor.rgb);
#endif
#ifdef DECAL_SMOOTHALPHA
decalTempAlpha=decalColor.a*decalColor.a;
#endif
surfaceAlbedo=mix(surfaceAlbedo.rgb,decalTempColor,decalTempAlpha);
#endif
`;if(!b.IncludesShadersStoreWGSL[f])b.IncludesShadersStoreWGSL[f]=k;var v={name:f,shader:k};
export{v as Qz};

//# debugId=CA141E1190F1154A64756E2164756E21
//# sourceMappingURL=site-bfmrmtj5.js.map
