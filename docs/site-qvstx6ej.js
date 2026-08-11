import{_B as b}from"./site-7jxv124x.js";var k="fresnelFunction",q=`#ifdef FRESNEL
fn computeFresnelTerm(viewDirection: vec3f,worldNormal: vec3f,bias: f32,power: f32)->f32
{let fresnelTerm: f32=pow(bias+abs(dot(viewDirection,worldNormal)),power);return clamp(fresnelTerm,0.,1.);}
#endif
`;if(!b.IncludesShadersStoreWGSL[k])b.IncludesShadersStoreWGSL[k]=q;var w={name:k,shader:q};
export{w as Oz};

//# debugId=006E562E8194962C64756E2164756E21
//# sourceMappingURL=site-qvstx6ej.js.map
