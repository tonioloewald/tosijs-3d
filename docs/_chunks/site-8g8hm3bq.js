import{DD as a}from"./site-53d1aqt6.js";var r="shadowMapFragmentSoftTransparentShadow",o=`#if SM_SOFTTRANSPARENTSHADOW==1
if ((bayerDither8(floor(((fragmentInputs.position.xy)%(8.0)))))/64.0>=uniforms.softTransparentShadowSM.x*alpha) {discard;}
#endif
`;if(!a.IncludesShadersStoreWGSL[r])a.IncludesShadersStoreWGSL[r]=o;var t={name:r,shader:o};
export{t as Yj};

//# debugId=1800A4BDE9D6C68A64756E2164756E21
//# sourceMappingURL=site-8g8hm3bq.js.map
