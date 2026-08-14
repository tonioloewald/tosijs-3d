import{_B as f}from"./site-1q3afg48.js";var k="sceneUboDeclaration",q=`struct Scene {viewProjection : mat4x4<f32>,
#ifdef MULTIVIEW
viewProjectionR : mat4x4<f32>,
#endif 
view : mat4x4<f32>,
projection : mat4x4<f32>,
vEyePosition : vec4<f32>,
inverseProjection : mat4x4<f32>,};
#define SCENE_UBO
var<uniform> scene : Scene;
`;if(!f.IncludesShadersStoreWGSL[k])f.IncludesShadersStoreWGSL[k]=q;var w={name:k,shader:q};
export{w as mA};

//# debugId=E4FB6DD406F19CA564756E2164756E21
//# sourceMappingURL=site-mvqptzb8.js.map
