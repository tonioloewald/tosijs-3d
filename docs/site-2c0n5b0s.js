import{_B as b}from"./site-7jxv124x.js";var f="logDepthVertex",k=`#ifdef LOGARITHMICDEPTH
vFragmentDepth=1.0+gl_Position.w;gl_Position.z=log2(max(0.000001,vFragmentDepth))*logarithmicDepthConstant;
#endif
`;if(!b.IncludesShadersStore[f])b.IncludesShadersStore[f]=k;var v={name:f,shader:k};
export{v as Vy};

//# debugId=510E22F3DCCF335564756E2164756E21
//# sourceMappingURL=site-2c0n5b0s.js.map
