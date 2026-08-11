import{_B as f}from"./site-7jxv124x.js";var k="sceneUboDeclaration",q=`struct Scene {viewProjection : mat4x4<f32>,
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

//# debugId=16CC0484AF54B36D64756E2164756E21
//# sourceMappingURL=site-8j04nt09.js.map
