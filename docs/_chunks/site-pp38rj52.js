import{i}from"./site-1yf4ncc8.js";var o="meshUboDeclaration",e=`#ifdef WEBGL2
uniform mat4 world;uniform float visibility;
#else
layout(std140,column_major) uniform;uniform Mesh
{mat4 world;float visibility;};
#endif
#define WORLD_UBO
`;if(!i.IncludesShadersStore[o])i.IncludesShadersStore[o]=e;var lr={name:o,shader:e};
export{lr};

//# debugId=E39350FECC49BF6E64756E2164756E21
//# sourceMappingURL=site-pp38rj52.js.map
