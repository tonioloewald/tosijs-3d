import{DD as e}from"./site-53d1aqt6.js";var o="sceneUboDeclaration",n=`struct Scene {viewProjection : mat4x4<f32>,
#ifdef MULTIVIEW
viewProjectionR : mat4x4<f32>,
#endif 
view : mat4x4<f32>,
projection : mat4x4<f32>,
vEyePosition : vec4<f32>,
inverseProjection : mat4x4<f32>,};
#define SCENE_UBO
var<uniform> scene : Scene;
`;if(!e.IncludesShadersStoreWGSL[o])e.IncludesShadersStoreWGSL[o]=n;var r={name:o,shader:n};
export{r as Pz};

//# debugId=20F17C36D270CE1D64756E2164756E21
//# sourceMappingURL=site-5mpt0yyf.js.map
