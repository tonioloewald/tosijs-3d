import{i}from"./site-1yf4ncc8.js";var o="meshUboDeclaration",e=`#ifdef WEBGL2
uniform mat4 world;uniform float visibility;
#else
layout(std140,column_major) uniform;uniform Mesh
{mat4 world;float visibility;};
#endif
#define WORLD_UBO
`;if(!i.IncludesShadersStore[o])i.IncludesShadersStore[o]=e;var ji={name:o,shader:e};
export{ji};

//# debugId=792177EECF6B0CC564756E2164756E21
//# sourceMappingURL=site-xdbjmd04.js.map
