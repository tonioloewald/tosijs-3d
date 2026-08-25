import{_B as e}from"./site-ea0e8ybd.js";var t="logDepthVertex",o=`#ifdef LOGARITHMICDEPTH
vFragmentDepth=1.0+gl_Position.w;gl_Position.z=log2(max(0.000001,vFragmentDepth))*logarithmicDepthConstant;
#endif
`;if(!e.IncludesShadersStore[t])e.IncludesShadersStore[t]=o;var n={name:t,shader:o};
export{n as Vy};

//# debugId=F0AC3B6E6F9C3D4964756E2164756E21
//# sourceMappingURL=site-8200q0kv.js.map
