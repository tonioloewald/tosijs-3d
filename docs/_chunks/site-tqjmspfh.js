import{FD as e}from"./site-vrsvvb55.js";var o="fogVertex",t=`#ifdef FOG
#ifdef SCENE_UBO
vertexOutputs.vFogDistance=(scene.view*worldPos).xyz;
#else
vertexOutputs.vFogDistance=(uniforms.view*worldPos).xyz;
#endif
#endif
`;if(!e.IncludesShadersStoreWGSL[o])e.IncludesShadersStoreWGSL[o]=t;var s={name:o,shader:t};
export{s as eA};

//# debugId=A47D6B80018EAA2964756E2164756E21
//# sourceMappingURL=site-tqjmspfh.js.map
