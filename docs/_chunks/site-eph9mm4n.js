import{_B as o}from"./site-ea0e8ybd.js";var e="meshUboDeclaration",i=`#ifdef WEBGL2
uniform mat4 world;uniform float visibility;
#else
layout(std140,column_major) uniform;uniform Mesh
{mat4 world;float visibility;};
#endif
#define WORLD_UBO
`;if(!o.IncludesShadersStore[e])o.IncludesShadersStore[e]=i;var t={name:e,shader:i};
export{t as Xy};

//# debugId=5478146A927B2BA064756E2164756E21
//# sourceMappingURL=site-eph9mm4n.js.map
