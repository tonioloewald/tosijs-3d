import{DD as e}from"./site-53d1aqt6.js";var r="decalFragment",o=`#ifdef DECAL
#ifdef GAMMADECAL
decalColor.rgb=toLinearSpace(decalColor.rgb);
#endif
#ifdef DECAL_SMOOTHALPHA
decalColor.a*=decalColor.a;
#endif
surfaceAlbedo.rgb=mix(surfaceAlbedo.rgb,decalColor.rgb,decalColor.a);
#endif
`;if(!e.IncludesShadersStore[r])e.IncludesShadersStore[r]=o;var d={name:r,shader:o};
export{d as jz};

//# debugId=649D9A8B51E9E03364756E2164756E21
//# sourceMappingURL=site-912bfr2y.js.map
