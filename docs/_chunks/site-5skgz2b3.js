import{_B as b}from"./site-1q3afg48.js";var k="shadowMapFragmentSoftTransparentShadow",l=`#if SM_SOFTTRANSPARENTSHADOW==1
if ((bayerDither8(floor(((fragmentInputs.position.xy)%(8.0)))))/64.0>=uniforms.softTransparentShadowSM.x*alpha) {discard;}
#endif
`;if(!b.IncludesShadersStoreWGSL[k])b.IncludesShadersStoreWGSL[k]=l;var v={name:k,shader:l};
export{v as Qj};

//# debugId=8B8245A9E615C6C064756E2164756E21
//# sourceMappingURL=site-5skgz2b3.js.map
