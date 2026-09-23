import{FD as e}from"./site-vrsvvb55.js";var a="decalFragment",l=`#ifdef DECAL
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
export{r as xy};

//# debugId=FA6AA71825D1D39864756E2164756E21
//# sourceMappingURL=site-55eqkbg9.js.map
