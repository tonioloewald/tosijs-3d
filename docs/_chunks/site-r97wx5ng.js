import{FD as e}from"./site-vrsvvb55.js";var r="fresnelFunction",o=`#ifdef FRESNEL
float computeFresnelTerm(vec3 viewDirection,vec3 worldNormal,float bias,float power)
{float fresnelTerm=pow(bias+abs(dot(viewDirection,worldNormal)),power);return clamp(fresnelTerm,0.,1.);}
#endif
`;if(!e.IncludesShadersStore[r])e.IncludesShadersStore[r]=o;var t={name:r,shader:o};
export{t as jz};

//# debugId=F44E8E47943AA80C64756E2164756E21
//# sourceMappingURL=site-r97wx5ng.js.map
