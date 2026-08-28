import{DD as a}from"./site-53d1aqt6.js";var r="shadowMapFragmentSoftTransparentShadow",o=`#if SM_SOFTTRANSPARENTSHADOW==1
if ((bayerDither8(floor(mod(gl_FragCoord.xy,8.0))))/64.0>=softTransparentShadowSM.x*alpha) discard;
#endif
`;if(!a.IncludesShadersStore[r])a.IncludesShadersStore[r]=o;var t={name:r,shader:o};
export{t as Ij};

//# debugId=185681E26D47F6EC64756E2164756E21
//# sourceMappingURL=site-g6babpx5.js.map
