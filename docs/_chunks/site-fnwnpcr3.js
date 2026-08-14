import{_B as b}from"./site-1q3afg48.js";var k="fogVertex",l=`#ifdef FOG
#ifdef SCENE_UBO
vertexOutputs.vFogDistance=(scene.view*worldPos).xyz;
#else
vertexOutputs.vFogDistance=(uniforms.view*worldPos).xyz;
#endif
#endif
`;if(!b.IncludesShadersStoreWGSL[k])b.IncludesShadersStoreWGSL[k]=l;var v={name:k,shader:l};
export{v as zA};

//# debugId=838D600FE045E5E364756E2164756E21
//# sourceMappingURL=site-fnwnpcr3.js.map
