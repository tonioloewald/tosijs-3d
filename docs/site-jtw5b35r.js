import{_B as b}from"./site-7jxv124x.js";var k="shadowMapFragmentSoftTransparentShadow",l=`#if SM_SOFTTRANSPARENTSHADOW==1
if ((bayerDither8(floor(mod(gl_FragCoord.xy,8.0))))/64.0>=softTransparentShadowSM.x*alpha) discard;
#endif
`;if(!b.IncludesShadersStore[k])b.IncludesShadersStore[k]=l;var v={name:k,shader:l};
export{v as Wj};

//# debugId=1FD660A2C488A5E864756E2164756E21
//# sourceMappingURL=site-jtw5b35r.js.map
