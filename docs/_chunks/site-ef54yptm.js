import{_B as b}from"./site-1q3afg48.js";var f="logDepthVertex",k=`#ifdef LOGARITHMICDEPTH
vFragmentDepth=1.0+gl_Position.w;gl_Position.z=log2(max(0.000001,vFragmentDepth))*logarithmicDepthConstant;
#endif
`;if(!b.IncludesShadersStore[f])b.IncludesShadersStore[f]=k;var v={name:f,shader:k};
export{v as Vy};

//# debugId=8C69855DD897ECCE64756E2164756E21
//# sourceMappingURL=site-ef54yptm.js.map
