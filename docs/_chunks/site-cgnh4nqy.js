import{_B as f}from"./site-1q3afg48.js";var k="meshUboDeclaration",q=`#ifdef WEBGL2
uniform mat4 world;uniform float visibility;
#else
layout(std140,column_major) uniform;uniform Mesh
{mat4 world;float visibility;};
#endif
#define WORLD_UBO
`;if(!f.IncludesShadersStore[k])f.IncludesShadersStore[k]=q;var w={name:k,shader:q};
export{w as Xy};

//# debugId=5A4ED70434E2FFFC64756E2164756E21
//# sourceMappingURL=site-cgnh4nqy.js.map
