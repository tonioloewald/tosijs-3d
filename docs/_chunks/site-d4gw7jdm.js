import{i}from"./site-1yf4ncc8.js";var e="logDepthVertex",t=`#ifdef LOGARITHMICDEPTH
vFragmentDepth=1.0+gl_Position.w;gl_Position.z=log2(max(0.000001,vFragmentDepth))*logarithmicDepthConstant;
#endif
`;if(!i.IncludesShadersStore[e])i.IncludesShadersStore[e]=t;var et={name:e,shader:t};
export{et};

//# debugId=2B5F3B367E372F2A64756E2164756E21
//# sourceMappingURL=site-d4gw7jdm.js.map
