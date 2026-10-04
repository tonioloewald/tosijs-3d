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
`;if(!i.IncludesShadersStoreWGSL[e])i.IncludesShadersStoreWGSL[e]=o;var Tt={name:e,shader:o};
export{Tt};

//# debugId=A1EE8A436D67BC7864756E2164756E21
//# sourceMappingURL=site-e0x3dbzq.js.map
