import{_B as e}from"./site-ea0e8ybd.js";var r="decalFragment",o=`#ifdef DECAL
#ifdef GAMMADECAL
decalColor.rgb=toLinearSpace(decalColor.rgb);
#endif
#ifdef DECAL_SMOOTHALPHA
decalColor.a*=decalColor.a;
#endif
surfaceAlbedo.rgb=mix(surfaceAlbedo.rgb,decalColor.rgb,decalColor.a);
#endif
`;if(!e.IncludesShadersStore[r])e.IncludesShadersStore[r]=o;var d={name:r,shader:o};
export{d as ry};

//# debugId=1B6D15AE63FF2C2D64756E2164756E21
//# sourceMappingURL=site-mye7j9kh.js.map
