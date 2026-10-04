import{i}from"./site-1yf4ncc8.js";var e="logDepthVertex",t=`#ifdef LOGARITHMICDEPTH
vFragmentDepth=1.0+gl_Position.w;gl_Position.z=log2(max(0.000001,vFragmentDepth))*logarithmicDepthConstant;
#endif
`;if(!i.IncludesShadersStore[e])i.IncludesShadersStore[e]=t;var rt={name:e,shader:t};
export{rt};

//# debugId=53AD6C85C9CAA55664756E2164756E21
//# sourceMappingURL=site-2trte94x.js.map
