import{FD as e}from"./site-vrsvvb55.js";var r="depthPrePass",t=`#ifdef DEPTHPREPASS
#if !defined(PREPASS) && !defined(ORDER_INDEPENDENT_TRANSPARENCY)
fragmentOutputs.color= vec4f(0.,0.,0.,1.0);
#endif
return fragmentOutputs;
#endif
`;if(!e.IncludesShadersStoreWGSL[r])e.IncludesShadersStoreWGSL[r]=t;var s={name:r,shader:t};
export{s as Dy};

//# debugId=799DD7BF2CB491C764756E2164756E21
//# sourceMappingURL=site-77znxx5n.js.map
