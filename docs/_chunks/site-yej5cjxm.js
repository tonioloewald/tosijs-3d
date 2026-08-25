import{_B as e}from"./site-ea0e8ybd.js";var o="fogVertex",t=`#ifdef FOG
#ifdef SCENE_UBO
vertexOutputs.vFogDistance=(scene.view*worldPos).xyz;
#else
vertexOutputs.vFogDistance=(uniforms.view*worldPos).xyz;
#endif
#endif
`;if(!e.IncludesShadersStoreWGSL[o])e.IncludesShadersStoreWGSL[o]=t;var s={name:o,shader:t};
export{s as zA};

//# debugId=524E76725670116364756E2164756E21
//# sourceMappingURL=site-yej5cjxm.js.map
