import{_B as e}from"./site-ea0e8ybd.js";var E="samplerFragmentDeclaration",_=`#ifdef _DEFINENAME_
#if _DEFINENAME_DIRECTUV==1
#define v_VARYINGNAME_UV vMainUV1
#elif _DEFINENAME_DIRECTUV==2
#define v_VARYINGNAME_UV vMainUV2
#elif _DEFINENAME_DIRECTUV==3
#define v_VARYINGNAME_UV vMainUV3
#elif _DEFINENAME_DIRECTUV==4
#define v_VARYINGNAME_UV vMainUV4
#elif _DEFINENAME_DIRECTUV==5
#define v_VARYINGNAME_UV vMainUV5
#elif _DEFINENAME_DIRECTUV==6
#define v_VARYINGNAME_UV vMainUV6
#else
varying vec2 v_VARYINGNAME_UV;
#endif
uniform sampler2D _SAMPLERNAME_Sampler;
#endif
`;if(!e.IncludesShadersStore[E])e.IncludesShadersStore[E]=_;var i={name:E,shader:_};
export{i as Hy};

//# debugId=292841475AB8B37D64756E2164756E21
//# sourceMappingURL=site-w9fzxgf6.js.map
