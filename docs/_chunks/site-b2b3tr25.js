import{DD as e}from"./site-53d1aqt6.js";var r="fresnelFunction",o=`#ifdef FRESNEL
float computeFresnelTerm(vec3 viewDirection,vec3 worldNormal,float bias,float power)
{float fresnelTerm=pow(bias+abs(dot(viewDirection,worldNormal)),power);return clamp(fresnelTerm,0.,1.);}
#endif
`;if(!e.IncludesShadersStore[r])e.IncludesShadersStore[r]=o;var t={name:r,shader:o};
export{t as hz};

//# debugId=F7FB82493164D0E064756E2164756E21
//# sourceMappingURL=site-b2b3tr25.js.map
