import{FD as e}from"./site-vrsvvb55.js";var o="sceneUboDeclaration",n=`struct Scene {viewProjection : mat4x4<f32>,
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
export{r as Rz};

//# debugId=3D87C616E36DFB6964756E2164756E21
//# sourceMappingURL=site-93bva1mf.js.map
