import{_B as b}from"./site-7jxv124x.js";var k="fogVertex",l=`#ifdef FOG
#ifdef SCENE_UBO
vertexOutputs.vFogDistance=(scene.view*worldPos).xyz;
#else
vertexOutputs.vFogDistance=(uniforms.view*worldPos).xyz;
#endif
#endif
`;if(!b.IncludesShadersStoreWGSL[k])b.IncludesShadersStoreWGSL[k]=l;var v={name:k,shader:l};
export{v as zA};

//# debugId=1852E60B7DE6A0EB64756E2164756E21
//# sourceMappingURL=site-5gffc1rv.js.map
