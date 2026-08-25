import{_B as e}from"./site-ea0e8ybd.js";var t="morphTargetsVertexDeclaration",f=`#ifdef MORPHTARGETS
#ifndef MORPHTARGETS_TEXTURE
#ifdef MORPHTARGETS_POSITION
attribute position{X} : vec3<f32>;
#endif
#ifdef MORPHTARGETS_NORMAL
attribute normal{X} : vec3<f32>;
#endif
#ifdef MORPHTARGETS_TANGENT
attribute tangent{X} : vec3<f32>;
#endif
#ifdef MORPHTARGETS_UV
attribute uv_{X} : vec2<f32>;
#endif
#ifdef MORPHTARGETS_UV2
attribute uv2_{X} : vec2<f32>;
#endif
#ifdef MORPHTARGETS_COLOR
attribute color{X} : vec4<f32>;
#endif
#elif {X}==0
uniform morphTargetCount: f32;
#endif
#endif
`;if(!e.IncludesShadersStoreWGSL[t])e.IncludesShadersStoreWGSL[t]=f;var r={name:t,shader:f};
export{r as Kz};

//# debugId=EEEED306225A79B164756E2164756E21
//# sourceMappingURL=site-n3gh9tjy.js.map
