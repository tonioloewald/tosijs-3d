import{FD as a}from"./site-vrsvvb55.js";var r="shadowMapFragmentSoftTransparentShadow",o=`#if SM_SOFTTRANSPARENTSHADOW==1
if ((bayerDither8(floor(mod(gl_FragCoord.xy,8.0))))/64.0>=softTransparentShadowSM.x*alpha) discard;
#endif
`;if(!a.IncludesShadersStore[r])a.IncludesShadersStore[r]=o;var t={name:r,shader:o};
export{t as Kj};

//# debugId=9DA03B851083A74364756E2164756E21
//# sourceMappingURL=site-t3qsph7c.js.map
