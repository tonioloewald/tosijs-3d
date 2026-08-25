import{_B as e}from"./site-ea0e8ybd.js";var r="depthPrePass",t=`#ifdef DEPTHPREPASS
#if !defined(PREPASS) && !defined(ORDER_INDEPENDENT_TRANSPARENCY)
fragmentOutputs.color= vec4f(0.,0.,0.,1.0);
#endif
return fragmentOutputs;
#endif
`;if(!e.IncludesShadersStoreWGSL[r])e.IncludesShadersStoreWGSL[r]=t;var s={name:r,shader:t};
export{s as Zz};

//# debugId=851744D5226D43E464756E2164756E21
//# sourceMappingURL=site-q3edtzfj.js.map
