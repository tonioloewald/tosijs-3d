import{_B as e}from"./site-ea0e8ybd.js";var t="morphTargetsVertexDeclaration",i=`#ifdef MORPHTARGETS
#ifndef MORPHTARGETS_TEXTURE
#ifdef MORPHTARGETS_POSITION
attribute vec3 position{X};
#endif
#ifdef MORPHTARGETS_NORMAL
attribute vec3 normal{X};
#endif
#ifdef MORPHTARGETS_TANGENT
attribute vec3 tangent{X};
#endif
#ifdef MORPHTARGETS_UV
attribute vec2 uv_{X};
#endif
#ifdef MORPHTARGETS_UV2
attribute vec2 uv2_{X};
#endif
#ifdef MORPHTARGETS_COLOR
attribute vec4 color{X};
#endif
#elif {X}==0
uniform float morphTargetCount;
#endif
#endif
`;if(!e.IncludesShadersStore[t])e.IncludesShadersStore[t]=i;var r={name:t,shader:i};
export{r as ny};

//# debugId=A5565E7A17C925FA64756E2164756E21
//# sourceMappingURL=site-7qs7fydd.js.map
