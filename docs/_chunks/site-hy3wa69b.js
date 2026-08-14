import{_B as b}from"./site-1q3afg48.js";var f="decalFragment",k=`#ifdef DECAL
#ifdef GAMMADECAL
decalColor.rgb=toLinearSpace(decalColor.rgb);
#endif
#ifdef DECAL_SMOOTHALPHA
decalColor.a*=decalColor.a;
#endif
surfaceAlbedo.rgb=mix(surfaceAlbedo.rgb,decalColor.rgb,decalColor.a);
#endif
`;if(!b.IncludesShadersStore[f])b.IncludesShadersStore[f]=k;var v={name:f,shader:k};
export{v as ry};

//# debugId=7639A80A27141D7164756E2164756E21
//# sourceMappingURL=site-hy3wa69b.js.map
