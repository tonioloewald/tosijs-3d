import{_B as b}from"./site-7jxv124x.js";var k="shadowMapFragmentSoftTransparentShadow",l=`#if SM_SOFTTRANSPARENTSHADOW==1
if ((bayerDither8(floor(((fragmentInputs.position.xy)%(8.0)))))/64.0>=uniforms.softTransparentShadowSM.x*alpha) {discard;}
#endif
`;if(!b.IncludesShadersStoreWGSL[k])b.IncludesShadersStoreWGSL[k]=l;var v={name:k,shader:l};
export{v as Qj};

//# debugId=1B2B67B272100B8764756E2164756E21
//# sourceMappingURL=site-36r8abwx.js.map
