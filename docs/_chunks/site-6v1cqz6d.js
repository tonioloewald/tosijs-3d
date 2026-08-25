import{_B as e}from"./site-ea0e8ybd.js";var r="fresnelFunction",o=`#ifdef FRESNEL
fn computeFresnelTerm(viewDirection: vec3f,worldNormal: vec3f,bias: f32,power: f32)->f32
{let fresnelTerm: f32=pow(bias+abs(dot(viewDirection,worldNormal)),power);return clamp(fresnelTerm,0.,1.);}
#endif
`;if(!e.IncludesShadersStoreWGSL[r])e.IncludesShadersStoreWGSL[r]=o;var f={name:r,shader:o};
export{f as Oz};

//# debugId=2FAA840313A89F2364756E2164756E21
//# sourceMappingURL=site-6v1cqz6d.js.map
