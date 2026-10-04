import{i}from"./site-1yf4ncc8.js";var e="fogVertexDeclaration",r=`#ifdef FOG
varying vFogDistance: vec3f;
#endif
`;if(!i.IncludesShadersStoreWGSL[e])i.IncludesShadersStoreWGSL[e]=r;var ct={name:e,shader:r};var o="fogVertex",t=`#ifdef FOG
#ifdef SCENE_UBO
vertexOutputs.vFogDistance=(scene.view*worldPos).xyz;
#else
vertexOutputs.vFogDistance=(uniforms.view*worldPos).xyz;
#endif
#endif
`;if(!i.IncludesShadersStoreWGSL[o])i.IncludesShadersStoreWGSL[o]=t;var ft={name:o,shader:t};
export{ct,ft};

//# debugId=016FD98DD6B4A19564756E2164756E21
//# sourceMappingURL=site-ndfh7s22.js.map
