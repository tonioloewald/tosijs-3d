import{i}from"./site-1yf4ncc8.js";var e="sceneUboDeclaration",o=`struct Scene {viewProjection : mat4x4<f32>,
#ifdef MULTIVIEW
viewProjectionR : mat4x4<f32>,
#endif 
view : mat4x4<f32>,
projection : mat4x4<f32>,
vEyePosition : vec4<f32>,
inverseProjection : mat4x4<f32>,};
#define SCENE_UBO
var<uniform> scene : Scene;
`;if(!i.IncludesShadersStoreWGSL[e])i.IncludesShadersStoreWGSL[e]=o;var Ct={name:e,shader:o};
export{Ct};

//# debugId=CFDF24A09B9CC55D64756E2164756E21
//# sourceMappingURL=site-czf9pgne.js.map
