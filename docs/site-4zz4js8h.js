import{_B as f}from"./site-7jxv124x.js";var k="boundingBoxRendererUboDeclaration",q=`#ifdef WEBGL2
uniform vec4 color;uniform mat4 world;uniform mat4 viewProjection;
#ifdef MULTIVIEW
uniform mat4 viewProjectionR;
#endif
#else
layout(std140,column_major) uniform;uniform BoundingBoxRenderer {vec4 color;mat4 world;mat4 viewProjection;mat4 viewProjectionR;};
#endif
`;if(!f.IncludesShadersStore[k])f.IncludesShadersStore[k]=q;var w={name:k,shader:q};
export{w as Vg};

//# debugId=ECF0C488177C54DE64756E2164756E21
//# sourceMappingURL=site-4zz4js8h.js.map
