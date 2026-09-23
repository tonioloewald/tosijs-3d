import{FD as o}from"./site-vrsvvb55.js";var e="meshUboDeclaration",i=`#ifdef WEBGL2
uniform mat4 world;uniform float visibility;
#else
layout(std140,column_major) uniform;uniform Mesh
{mat4 world;float visibility;};
#endif
#define WORLD_UBO
`;if(!o.IncludesShadersStore[e])o.IncludesShadersStore[e]=i;var t={name:e,shader:i};
export{t as Iz};

//# debugId=48D3F33E43468F0964756E2164756E21
//# sourceMappingURL=site-61a59p2s.js.map
