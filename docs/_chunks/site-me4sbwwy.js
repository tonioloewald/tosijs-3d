import{_B as b}from"./site-1q3afg48.js";var f="morphTargetsVertexDeclaration",k=`#ifdef MORPHTARGETS
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
`;if(!b.IncludesShadersStore[f])b.IncludesShadersStore[f]=k;var v={name:f,shader:k};
export{v as ny};

//# debugId=DAC4CC7F9D45596664756E2164756E21
//# sourceMappingURL=site-me4sbwwy.js.map
