import{i}from"./site-1yf4ncc8.js";var e="logDepthVertex",t=`#ifdef LOGARITHMICDEPTH
vFragmentDepth=1.0+gl_Position.w;gl_Position.z=log2(max(0.000001,vFragmentDepth))*logarithmicDepthConstant;
#endif
`;if(!i.IncludesShadersStore[e])i.IncludesShadersStore[e]=t;var ot={name:e,shader:t};
export{ot};

//# debugId=5F496111FE91327464756E2164756E21
//# sourceMappingURL=site-vcxc6ktc.js.map
