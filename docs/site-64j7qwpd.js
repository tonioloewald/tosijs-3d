import{_B as b}from"./site-7jxv124x.js";var k="fresnelFunction",q=`#ifdef FRESNEL
float computeFresnelTerm(vec3 viewDirection,vec3 worldNormal,float bias,float power)
{float fresnelTerm=pow(bias+abs(dot(viewDirection,worldNormal)),power);return clamp(fresnelTerm,0.,1.);}
#endif
`;if(!b.IncludesShadersStore[k])b.IncludesShadersStore[k]=q;var w={name:k,shader:q};
export{w as py};

//# debugId=9842225C6BA709F864756E2164756E21
//# sourceMappingURL=site-64j7qwpd.js.map
