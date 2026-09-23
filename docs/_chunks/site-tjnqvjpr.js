import{FD as e}from"./site-vrsvvb55.js";var t="logDepthVertex",o=`#ifdef LOGARITHMICDEPTH
vFragmentDepth=1.0+gl_Position.w;gl_Position.z=log2(max(0.000001,vFragmentDepth))*logarithmicDepthConstant;
#endif
`;if(!e.IncludesShadersStore[t])e.IncludesShadersStore[t]=o;var n={name:t,shader:o};
export{n as hz};

//# debugId=46CE1FB6D7BD930E64756E2164756E21
//# sourceMappingURL=site-tjnqvjpr.js.map
