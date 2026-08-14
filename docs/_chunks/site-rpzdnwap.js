import{_B as b}from"./site-1q3afg48.js";var k="fresnelFunction",q=`#ifdef FRESNEL
fn computeFresnelTerm(viewDirection: vec3f,worldNormal: vec3f,bias: f32,power: f32)->f32
{let fresnelTerm: f32=pow(bias+abs(dot(viewDirection,worldNormal)),power);return clamp(fresnelTerm,0.,1.);}
#endif
`;if(!b.IncludesShadersStoreWGSL[k])b.IncludesShadersStoreWGSL[k]=q;var w={name:k,shader:q};
export{w as Oz};

//# debugId=5323E56AFBBF677964756E2164756E21
//# sourceMappingURL=site-rpzdnwap.js.map
