import{DD as e}from"./site-53d1aqt6.js";var o="fogVertex",t=`#ifdef FOG
#ifdef SCENE_UBO
vertexOutputs.vFogDistance=(scene.view*worldPos).xyz;
#else
vertexOutputs.vFogDistance=(uniforms.view*worldPos).xyz;
#endif
#endif
`;if(!e.IncludesShadersStoreWGSL[o])e.IncludesShadersStoreWGSL[o]=t;var s={name:o,shader:t};
export{s as cA};

//# debugId=348E4446D95C5B0364756E2164756E21
//# sourceMappingURL=site-5ewpa529.js.map
