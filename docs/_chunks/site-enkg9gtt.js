import{DD as e}from"./site-53d1aqt6.js";var r="fresnelFunction",o=`#ifdef FRESNEL
fn computeFresnelTerm(viewDirection: vec3f,worldNormal: vec3f,bias: f32,power: f32)->f32
{let fresnelTerm: f32=pow(bias+abs(dot(viewDirection,worldNormal)),power);return clamp(fresnelTerm,0.,1.);}
#endif
`;if(!e.IncludesShadersStoreWGSL[r])e.IncludesShadersStoreWGSL[r]=o;var f={name:r,shader:o};
export{f as ty};

//# debugId=F09B025E93C786AD64756E2164756E21
//# sourceMappingURL=site-enkg9gtt.js.map
