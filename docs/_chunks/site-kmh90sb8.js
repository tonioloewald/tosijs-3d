import{_B as b}from"./site-1q3afg48.js";var k="fresnelFunction",q=`#ifdef FRESNEL
float computeFresnelTerm(vec3 viewDirection,vec3 worldNormal,float bias,float power)
{float fresnelTerm=pow(bias+abs(dot(viewDirection,worldNormal)),power);return clamp(fresnelTerm,0.,1.);}
#endif
`;if(!b.IncludesShadersStore[k])b.IncludesShadersStore[k]=q;var w={name:k,shader:q};
export{w as py};

//# debugId=BA172DE0B0F3E01A64756E2164756E21
//# sourceMappingURL=site-kmh90sb8.js.map
