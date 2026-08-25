import{_B as e}from"./site-ea0e8ybd.js";var o="sceneUboDeclaration",n=`struct Scene {viewProjection : mat4x4<f32>,
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
export{r as mA};

//# debugId=8324FA1F35A4216264756E2164756E21
//# sourceMappingURL=site-1nn7frmg.js.map
