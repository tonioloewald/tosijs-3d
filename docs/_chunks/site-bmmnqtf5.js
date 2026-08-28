import{DD as e}from"./site-53d1aqt6.js";var t="logDepthVertex",o=`#ifdef LOGARITHMICDEPTH
vFragmentDepth=1.0+gl_Position.w;gl_Position.z=log2(max(0.000001,vFragmentDepth))*logarithmicDepthConstant;
#endif
`;if(!e.IncludesShadersStore[t])e.IncludesShadersStore[t]=o;var n={name:t,shader:o};
export{n as fz};

//# debugId=48746264B8EF84F064756E2164756E21
//# sourceMappingURL=site-bmmnqtf5.js.map
