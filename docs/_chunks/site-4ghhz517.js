import{_B as e}from"./site-ea0e8ybd.js";var i="clipPlaneFragment",f=`#if defined(CLIPPLANE) || defined(CLIPPLANE2) || defined(CLIPPLANE3) || defined(CLIPPLANE4) || defined(CLIPPLANE5) || defined(CLIPPLANE6)
if (false) {}
#endif
#ifdef CLIPPLANE
else if (fragmentInputs.fClipDistance>0.0)
{discard;}
#endif
#ifdef CLIPPLANE2
else if (fragmentInputs.fClipDistance2>0.0)
{discard;}
#endif
#ifdef CLIPPLANE3
else if (fragmentInputs.fClipDistance3>0.0)
{discard;}
#endif
#ifdef CLIPPLANE4
else if (fragmentInputs.fClipDistance4>0.0)
{discard;}
#endif
#ifdef CLIPPLANE5
else if (fragmentInputs.fClipDistance5>0.0)
{discard;}
#endif
#ifdef CLIPPLANE6
else if (fragmentInputs.fClipDistance6>0.0)
{discard;}
#endif
`;if(!e.IncludesShadersStoreWGSL[i])e.IncludesShadersStoreWGSL[i]=f;var n={name:i,shader:f};
export{n as GA};

//# debugId=7273FC8C674769E264756E2164756E21
//# sourceMappingURL=site-4ghhz517.js.map
