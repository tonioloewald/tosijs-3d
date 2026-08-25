import{_B as a}from"./site-ea0e8ybd.js";var r="shadowMapFragmentSoftTransparentShadow",o=`#if SM_SOFTTRANSPARENTSHADOW==1
if ((bayerDither8(floor(((fragmentInputs.position.xy)%(8.0)))))/64.0>=uniforms.softTransparentShadowSM.x*alpha) {discard;}
#endif
`;if(!a.IncludesShadersStoreWGSL[r])a.IncludesShadersStoreWGSL[r]=o;var t={name:r,shader:o};
export{t as Qj};

//# debugId=164690E9D9B75DE564756E2164756E21
//# sourceMappingURL=site-s8spxbcq.js.map
