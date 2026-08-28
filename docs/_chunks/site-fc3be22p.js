import{DD as e}from"./site-53d1aqt6.js";var a="decalFragment",l=`#ifdef DECAL
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
export{r as vy};

//# debugId=5EBC863E86F486D964756E2164756E21
//# sourceMappingURL=site-fc3be22p.js.map
