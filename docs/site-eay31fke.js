import{_B as f}from"./site-7jxv124x.js";var k="meshUboDeclaration",q=`#ifdef WEBGL2
uniform mat4 world;uniform float visibility;
#else
layout(std140,column_major) uniform;uniform Mesh
{mat4 world;float visibility;};
#endif
#define WORLD_UBO
`;if(!f.IncludesShadersStore[k])f.IncludesShadersStore[k]=q;var w={name:k,shader:q};
export{w as Xy};

//# debugId=3FB65948BF5BFB6864756E2164756E21
//# sourceMappingURL=site-eay31fke.js.map
