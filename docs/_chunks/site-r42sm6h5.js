import{_B as e}from"./site-ea0e8ybd.js";var r="fresnelFunction",o=`#ifdef FRESNEL
float computeFresnelTerm(vec3 viewDirection,vec3 worldNormal,float bias,float power)
{float fresnelTerm=pow(bias+abs(dot(viewDirection,worldNormal)),power);return clamp(fresnelTerm,0.,1.);}
#endif
`;if(!e.IncludesShadersStore[r])e.IncludesShadersStore[r]=o;var t={name:r,shader:o};
export{t as py};

//# debugId=A77F1F1C3353B42464756E2164756E21
//# sourceMappingURL=site-r42sm6h5.js.map
