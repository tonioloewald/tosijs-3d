import{_B as o}from"./site-ea0e8ybd.js";var e="boundingBoxRendererUboDeclaration",r=`#ifdef WEBGL2
uniform vec4 color;uniform mat4 world;uniform mat4 viewProjection;
#ifdef MULTIVIEW
uniform mat4 viewProjectionR;
#endif
#else
layout(std140,column_major) uniform;uniform BoundingBoxRenderer {vec4 color;mat4 world;mat4 viewProjection;mat4 viewProjectionR;};
#endif
`;if(!o.IncludesShadersStore[e])o.IncludesShadersStore[e]=r;var i={name:e,shader:r};
export{i as Vg};

//# debugId=EEFD77437FF5F41964756E2164756E21
//# sourceMappingURL=site-ctf31wdz.js.map
