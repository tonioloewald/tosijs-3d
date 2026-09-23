import{FD as a}from"./site-vrsvvb55.js";var r="shadowMapFragmentSoftTransparentShadow",o=`#if SM_SOFTTRANSPARENTSHADOW==1
if ((bayerDither8(floor(((fragmentInputs.position.xy)%(8.0)))))/64.0>=uniforms.softTransparentShadowSM.x*alpha) {discard;}
#endif
`;if(!a.IncludesShadersStoreWGSL[r])a.IncludesShadersStoreWGSL[r]=o;var t={name:r,shader:o};
export{t as _j};

//# debugId=363F58F3C501957A64756E2164756E21
//# sourceMappingURL=site-rm72xfbj.js.map
