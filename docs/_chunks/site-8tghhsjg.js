import{FD as e}from"./site-vrsvvb55.js";var r="decalFragment",o=`#ifdef DECAL
#ifdef GAMMADECAL
decalColor.rgb=toLinearSpace(decalColor.rgb);
#endif
#ifdef DECAL_SMOOTHALPHA
decalColor.a*=decalColor.a;
#endif
surfaceAlbedo.rgb=mix(surfaceAlbedo.rgb,decalColor.rgb,decalColor.a);
#endif
`;if(!e.IncludesShadersStore[r])e.IncludesShadersStore[r]=o;var d={name:r,shader:o};
export{d as lz};

//# debugId=CF589DA418AD5AF464756E2164756E21
//# sourceMappingURL=site-8tghhsjg.js.map
