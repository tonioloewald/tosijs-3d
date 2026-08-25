import{_B as e}from"./site-ea0e8ybd.js";var a="decalFragment",l=`#ifdef DECAL
var decalTempColor=decalColor.rgb;var decalTempAlpha=decalColor.a;
#ifdef GAMMADECAL
decalTempColor=toLinearSpaceVec3(decalColor.rgb);
#endif
#ifdef DECAL_SMOOTHALPHA
decalTempAlpha=decalColor.a*decalColor.a;
#endif
surfaceAlbedo=mix(surfaceAlbedo.rgb,decalTempColor,decalTempAlpha);
#endif
`;if(!e.IncludesShadersStoreWGSL[a])e.IncludesShadersStoreWGSL[a]=l;var r={name:a,shader:l};
export{r as Qz};

//# debugId=75D6F05F9275A57264756E2164756E21
//# sourceMappingURL=site-hycpsns9.js.map
