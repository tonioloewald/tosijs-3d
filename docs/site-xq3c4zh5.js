import{_B as b}from"./site-7jxv124x.js";var f="decalFragment",k=`#ifdef DECAL
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

//# debugId=FD854C2A5D5DF3E364756E2164756E21
//# sourceMappingURL=site-xq3c4zh5.js.map
