import{_B as a}from"./site-ea0e8ybd.js";var r="shadowMapFragmentSoftTransparentShadow",o=`#if SM_SOFTTRANSPARENTSHADOW==1
if ((bayerDither8(floor(mod(gl_FragCoord.xy,8.0))))/64.0>=softTransparentShadowSM.x*alpha) discard;
#endif
`;if(!a.IncludesShadersStore[r])a.IncludesShadersStore[r]=o;var t={name:r,shader:o};
export{t as Wj};

//# debugId=63CA6AA5A3D54C6264756E2164756E21
//# sourceMappingURL=site-v3pk2qk0.js.map
