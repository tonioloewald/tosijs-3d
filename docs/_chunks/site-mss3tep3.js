import{_B as f}from"./site-1q3afg48.js";var k="boundingBoxRendererUboDeclaration",q=`#ifdef WEBGL2
uniform vec4 color;uniform mat4 world;uniform mat4 viewProjection;
#ifdef MULTIVIEW
uniform mat4 viewProjectionR;
#endif
#else
layout(std140,column_major) uniform;uniform BoundingBoxRenderer {vec4 color;mat4 world;mat4 viewProjection;mat4 viewProjectionR;};
#endif
`;if(!f.IncludesShadersStore[k])f.IncludesShadersStore[k]=q;var w={name:k,shader:q};
export{w as Vg};

//# debugId=99D24A91DA25119964756E2164756E21
//# sourceMappingURL=site-mss3tep3.js.map
