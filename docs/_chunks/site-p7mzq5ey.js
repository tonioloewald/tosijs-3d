import{i}from"./site-1yf4ncc8.js";var o="meshUboDeclaration",e=`#ifdef WEBGL2
uniform mat4 world;uniform float visibility;
#else
layout(std140,column_major) uniform;uniform Mesh
{mat4 world;float visibility;};
#endif
#define WORLD_UBO
`;if(!i.IncludesShadersStore[o])i.IncludesShadersStore[o]=e;var ur={name:o,shader:e};
export{ur};

//# debugId=B9CF469BF656987564756E2164756E21
//# sourceMappingURL=site-p7mzq5ey.js.map
