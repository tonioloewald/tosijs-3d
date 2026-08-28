import{DD as e}from"./site-53d1aqt6.js";var r="depthPrePass",t=`#ifdef DEPTHPREPASS
#if !defined(PREPASS) && !defined(ORDER_INDEPENDENT_TRANSPARENCY)
fragmentOutputs.color= vec4f(0.,0.,0.,1.0);
#endif
return fragmentOutputs;
#endif
`;if(!e.IncludesShadersStoreWGSL[r])e.IncludesShadersStoreWGSL[r]=t;var s={name:r,shader:t};
export{s as By};

//# debugId=CC7C634E9CF0DD3D64756E2164756E21
//# sourceMappingURL=site-awye310w.js.map
